import type {
  AcceptConsentInput,
  AdminAuditPage,
  AdminAuditQuery,
  AdminMetrics,
  AdminSuspendInput,
  AdminUserDetail,
  AdminUserListPage,
  AdminUserListQuery,
  BillingState,
  BillingUrl,
  CreateCheckoutInput,
  AtributoCodigo,
  AttributeLogPage,
  AttributeLogQuery,
  AttributesSummary,
  AvatarId,
  ConsentList,
  ConsentRecord,
  DailyEntry,
  DailyEntryInput,
  DailyWeight,
  DailyWeightInput,
  DailyWeightListInput,
  DashboardHeader,
  ExerciseLog,
  ExerciseLogInput,
  ImpersonateOutput,
  IncrementAttributeInput,
  LogPageQuery,
  LoginInput,
  ManualXpInput,
  Me,
  PathDestination,
  RegisterInput,
  ThemePreference,
  TokenPair,
  UpdateAvatarInput,
  UpdateThemeInput,
  UserProfile,
  UserProfileInput,
  WeekStatus,
  WeeksSummary,
  WeightChartRange,
  WeightChartResponse,
  XpLogPage,
  XpSummary,
} from '@perdida-peso/schemas';

export interface ApiClientOptions {
  baseUrl: string;
  fetch?: typeof globalThis.fetch;
  /**
   * Tokens iniciales si los hay (ej. los que el frontend leyó de cookies
   * al cargar la página).
   */
  initialTokens?: TokenPair | null;
  /**
   * Callback que se llama cada vez que cambian los tokens (login, refresh,
   * logout). El frontend lo usa para persistirlos en cookie/storage.
   */
  onTokensChange?: (tokens: TokenPair | null) => void;
}

export interface HealthResponse {
  status: string;
  info?: Record<string, unknown>;
  error?: Record<string, unknown>;
  details?: Record<string, unknown>;
}

class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly fetch: typeof globalThis.fetch;
  private readonly onTokensChange?: (tokens: TokenPair | null) => void;
  private tokens: TokenPair | null;
  private refreshInflight: Promise<TokenPair> | null = null;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.tokens = options.initialTokens ?? null;
    this.onTokensChange = options.onTokensChange;
  }

  // ── Auth ─────────────────────────────────────────────────────────
  async register(input: RegisterInput): Promise<TokenPair> {
    const tokens = await this.unauthedJson<TokenPair>('POST', '/v1/auth/register', input);
    this.setTokens(tokens);
    return tokens;
  }

  async login(input: LoginInput): Promise<TokenPair> {
    const tokens = await this.unauthedJson<TokenPair>('POST', '/v1/auth/login', input);
    this.setTokens(tokens);
    return tokens;
  }

  async logout(): Promise<void> {
    if (!this.tokens) return;
    try {
      await this.authedJson<void>('POST', '/v1/auth/logout');
    } finally {
      this.setTokens(null);
    }
  }

  async me(): Promise<Me> {
    return this.authedJson<Me>('GET', '/v1/auth/me');
  }

  // ── Verificación de email ────────────────────────────────────────
  async verifyEmail(token: string): Promise<void> {
    await this.unauthedJson<void>('POST', '/v1/auth/verify-email', { token });
  }

  async resendVerification(): Promise<void> {
    await this.authedJson<void>('POST', '/v1/auth/resend-verification');
  }

  // ── Password reset ───────────────────────────────────────────────
  async requestPasswordReset(email: string): Promise<void> {
    await this.unauthedJson<void>('POST', '/v1/auth/request-password-reset', { email });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await this.unauthedJson<void>('POST', '/v1/auth/reset-password', { token, newPassword });
  }

  // ── Legal: consents y export RGPD ────────────────────────────────
  async acceptConsent(input: AcceptConsentInput): Promise<ConsentRecord> {
    return this.authedJson<ConsentRecord>('POST', '/v1/consents', input);
  }

  async listMyConsents(): Promise<ConsentList> {
    return this.authedJson<ConsentList>('GET', '/v1/consents/me');
  }

  /**
   * Descarga el export RGPD como Blob. El caller decide qué hacer
   * (típicamente: crear un Object URL y disparar un download
   * programático).
   */
  async downloadMyExport(): Promise<{ blob: Blob; filename: string }> {
    if (!this.tokens) throw new ApiError(401, 'No hay sesión activa', null);
    const res = await this.fetch(`${this.baseUrl}/v1/users/me/export`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${this.tokens.accessToken}` },
    });
    if (!res.ok) {
      throw new ApiError(res.status, `Export falló: ${res.status}`, await safeJson(res));
    }
    const disposition = res.headers.get('content-disposition') ?? '';
    const match = /filename="([^"]+)"/i.exec(disposition);
    const filename = match?.[1] ?? `perdida-peso-export-${new Date().toISOString().slice(0, 10)}.json`;
    const blob = await res.blob();
    return { blob, filename };
  }

  // ── Borrar cuenta ────────────────────────────────────────────────
  async deleteAccount(password: string): Promise<{ purgeScheduledAt: string }> {
    const result = await this.authedJson<{ purgeScheduledAt: string }>(
      'POST',
      '/v1/auth/delete-account',
      { password },
    );
    this.setTokens(null);
    return result;
  }

  // ── Profile ──────────────────────────────────────────────────────
  async getMyProfile(): Promise<UserProfile> {
    return this.authedJson<UserProfile>('GET', '/v1/users/me/profile');
  }

  async upsertMyProfile(input: UserProfileInput): Promise<UserProfile> {
    return this.authedJson<UserProfile>('PUT', '/v1/users/me/profile', input);
  }

  async updateAvatar(avatarId: AvatarId): Promise<{ avatarId: AvatarId }> {
    const body: UpdateAvatarInput = { avatarId };
    return this.authedJson<{ avatarId: AvatarId }>('PUT', '/v1/users/me/avatar', body);
  }

  async updateTheme(themePreference: ThemePreference): Promise<{ themePreference: ThemePreference }> {
    const body: UpdateThemeInput = { themePreference };
    return this.authedJson<{ themePreference: ThemePreference }>(
      'PUT',
      '/v1/users/me/theme',
      body,
    );
  }

  // ── Weights ──────────────────────────────────────────────────────
  async listWeights(filter: DailyWeightListInput = {}): Promise<DailyWeight[]> {
    const search = new URLSearchParams();
    if (filter.from) search.set('from', filter.from);
    if (filter.to) search.set('to', filter.to);
    const qs = search.toString();
    return this.authedJson<DailyWeight[]>('GET', `/v1/weights${qs ? `?${qs}` : ''}`);
  }

  async upsertWeight(input: DailyWeightInput): Promise<DailyWeight> {
    return this.authedJson<DailyWeight>('PUT', '/v1/weights', input);
  }

  async deleteWeight(fecha: string): Promise<void> {
    await this.authedJson<void>('DELETE', `/v1/weights/${fecha}`);
  }

  // ── Dashboard ────────────────────────────────────────────────────
  async getDashboardHeader(): Promise<DashboardHeader> {
    return this.authedJson<DashboardHeader>('GET', '/v1/dashboard/header');
  }

  // ── XP ───────────────────────────────────────────────────────────
  async getXpSummary(): Promise<XpSummary> {
    return this.authedJson<XpSummary>('GET', '/v1/xp/summary');
  }

  async addManualXp(input: ManualXpInput): Promise<{ id: string; xp: number }> {
    return this.authedJson<{ id: string; xp: number }>('POST', '/v1/xp/manual', input);
  }

  async getXpLog(query: LogPageQuery = { limit: 50 }): Promise<XpLogPage> {
    const search = new URLSearchParams();
    if (query.cursor) search.set('cursor', query.cursor);
    search.set('limit', String(query.limit ?? 50));
    return this.authedJson<XpLogPage>('GET', `/v1/xp/log?${search.toString()}`);
  }

  // ── Entries (deporte e hidratación) ──────────────────────────────
  async getEntry(fecha: string): Promise<DailyEntry> {
    return this.authedJson<DailyEntry>('GET', `/v1/entries/${fecha}`);
  }

  async upsertEntry(fecha: string, input: DailyEntryInput): Promise<DailyEntry> {
    return this.authedJson<DailyEntry>('PUT', `/v1/entries/${fecha}`, input);
  }

  async listExercises(fecha: string): Promise<ExerciseLog[]> {
    return this.authedJson<ExerciseLog[]>('GET', `/v1/entries/${fecha}/exercise`);
  }

  async addExercise(fecha: string, input: Omit<ExerciseLogInput, 'fecha'>): Promise<ExerciseLog> {
    return this.authedJson<ExerciseLog>('POST', `/v1/entries/${fecha}/exercise`, {
      ...input,
      fecha,
    });
  }

  async deleteExercise(fecha: string, id: string): Promise<void> {
    await this.authedJson<void>('DELETE', `/v1/entries/${fecha}/exercise/${id}`);
  }

  // ── Attributes ───────────────────────────────────────────────────
  async getAttributes(): Promise<AttributesSummary> {
    return this.authedJson<AttributesSummary>('GET', '/v1/attributes');
  }

  async incrementAttribute(
    code: AtributoCodigo,
    input: IncrementAttributeInput,
  ): Promise<{ valor: number; alcanzadoHoy: boolean }> {
    return this.authedJson<{ valor: number; alcanzadoHoy: boolean }>(
      'POST',
      `/v1/attributes/${code}/increment`,
      input,
    );
  }

  async getAttributesLog(
    query: AttributeLogQuery = { limit: 50 },
  ): Promise<AttributeLogPage> {
    const search = new URLSearchParams();
    if (query.cursor) search.set('cursor', query.cursor);
    search.set('limit', String(query.limit ?? 50));
    if (query.atributo) search.set('atributo', query.atributo);
    return this.authedJson<AttributeLogPage>('GET', `/v1/attributes/log?${search.toString()}`);
  }

  // ── Weeks ────────────────────────────────────────────────────────
  async getWeeks(): Promise<WeeksSummary> {
    return this.authedJson<WeeksSummary>('GET', '/v1/weeks');
  }

  async applyColchon(weekId: string): Promise<WeekStatus> {
    return this.authedJson<WeekStatus>(
      'POST',
      `/v1/weeks/${weekId}/apply-colchon`,
      { confirmar: true },
    );
  }

  // ── Path al destino ──────────────────────────────────────────────
  async getPathDestination(): Promise<PathDestination> {
    return this.authedJson<PathDestination>('GET', '/v1/path/destination');
  }

  async buyLevel(): Promise<{ nivelComprado: number; nivelActual: number; colchonRestante: number }> {
    return this.authedJson('POST', '/v1/path/buy-level', { confirmar: true });
  }

  // ── Charts ───────────────────────────────────────────────────────
  async getWeightChart(range: WeightChartRange = '30d'): Promise<WeightChartResponse> {
    return this.authedJson<WeightChartResponse>('GET', `/v1/charts/weight?range=${range}`);
  }

  // ── Billing ──────────────────────────────────────────────────────
  async getMyBilling(): Promise<BillingState> {
    return this.authedJson<BillingState>('GET', '/v1/billing/me');
  }

  async createCheckout(input: CreateCheckoutInput): Promise<BillingUrl> {
    return this.authedJson<BillingUrl>('POST', '/v1/billing/checkout', input);
  }

  async createPortalSession(): Promise<BillingUrl> {
    return this.authedJson<BillingUrl>('POST', '/v1/billing/portal', {});
  }

  // ── Admin (require role admin) ───────────────────────────────────
  async getAdminMetrics(): Promise<AdminMetrics> {
    return this.authedJson<AdminMetrics>('GET', '/v1/admin/metrics');
  }

  async listAdminUsers(query: AdminUserListQuery = { limit: 50 }): Promise<AdminUserListPage> {
    const search = new URLSearchParams();
    if (query.cursor) search.set('cursor', query.cursor);
    search.set('limit', String(query.limit ?? 50));
    if (query.q) search.set('q', query.q);
    return this.authedJson<AdminUserListPage>('GET', `/v1/admin/users?${search.toString()}`);
  }

  async getAdminUser(id: string): Promise<AdminUserDetail> {
    return this.authedJson<AdminUserDetail>('GET', `/v1/admin/users/${id}`);
  }

  async suspendUser(id: string, input: AdminSuspendInput = {}): Promise<{ suspendedAt: string }> {
    return this.authedJson<{ suspendedAt: string }>(
      'POST',
      `/v1/admin/users/${id}/suspend`,
      input,
    );
  }

  async restoreUser(id: string): Promise<void> {
    await this.authedJson<void>('POST', `/v1/admin/users/${id}/restore`, {});
  }

  /**
   * Impersona al usuario y reemplaza los tokens del cliente.
   * Devuelve la info del target. El caller debería persistir
   * `prevTokens` antes de llamar para poder revertir más tarde.
   */
  async impersonateUser(id: string): Promise<ImpersonateOutput> {
    const res = await this.authedJson<ImpersonateOutput>(
      'POST',
      `/v1/admin/users/${id}/impersonate`,
      {},
    );
    this.setTokens({
      accessToken: res.accessToken,
      refreshToken: res.refreshToken,
      expiresIn: res.expiresIn,
    });
    return res;
  }

  async listAdminAudit(query: AdminAuditQuery = { limit: 50 }): Promise<AdminAuditPage> {
    const search = new URLSearchParams();
    if (query.cursor) search.set('cursor', query.cursor);
    search.set('limit', String(query.limit ?? 50));
    return this.authedJson<AdminAuditPage>('GET', `/v1/admin/audit?${search.toString()}`);
  }

  // ── Health (público) ─────────────────────────────────────────────
  async health(): Promise<HealthResponse> {
    const res = await this.fetch(`${this.baseUrl}/health`);
    if (!res.ok) {
      throw new ApiError(res.status, `Health check falló: ${res.status}`, await safeJson(res));
    }
    return (await res.json()) as HealthResponse;
  }

  // ── Tokens ───────────────────────────────────────────────────────
  setTokens(tokens: TokenPair | null): void {
    this.tokens = tokens;
    this.onTokensChange?.(tokens);
  }

  getTokens(): TokenPair | null {
    return this.tokens;
  }

  // ── Internals ────────────────────────────────────────────────────
  private async authedJson<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (!this.tokens) {
      throw new ApiError(401, 'No hay sesión activa', null);
    }
    const res = await this.requestWithToken(method, path, this.tokens.accessToken, body);

    if (res.status === 401) {
      // Probar a refrescar y reintentar una vez.
      const refreshed = await this.tryRefresh();
      if (refreshed) {
        const retry = await this.requestWithToken(method, path, refreshed.accessToken, body);
        return parseJson<T>(retry);
      }
      this.setTokens(null);
      throw new ApiError(401, 'Sesión expirada', await safeJson(res));
    }

    return parseJson<T>(res);
  }

  private async unauthedJson<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await this.fetch(`${this.baseUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return parseJson<T>(res);
  }

  private requestWithToken(method: string, path: string, accessToken: string, body?: unknown): Promise<Response> {
    return this.fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  private async tryRefresh(): Promise<TokenPair | null> {
    if (!this.tokens?.refreshToken) return null;
    if (this.refreshInflight) {
      try {
        return await this.refreshInflight;
      } catch {
        return null;
      }
    }

    this.refreshInflight = (async () => {
      const res = await this.fetch(`${this.baseUrl}/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.tokens!.refreshToken }),
      });
      if (!res.ok) {
        throw new ApiError(res.status, 'Refresh falló', await safeJson(res));
      }
      const tokens = (await res.json()) as TokenPair;
      this.setTokens(tokens);
      return tokens;
    })();

    try {
      return await this.refreshInflight;
    } catch {
      return null;
    } finally {
      this.refreshInflight = null;
    }
  }
}

async function parseJson<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  if (!res.ok) {
    throw new ApiError(res.status, `${res.status} ${res.statusText}`, await safeJson(res));
  }
  return (await res.json()) as T;
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.clone().json();
  } catch {
    return null;
  }
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  return new ApiClient(options);
}

export { ApiError };
