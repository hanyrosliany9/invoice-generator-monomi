import { apiClient } from '../config/api';

/** Staff-side management of a client's portal contacts (external users). */
export interface PortalContact {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
}

/** Tolerate both `{ data: T }` envelopes and bare bodies. */
function unwrap<T>(body: unknown): T {
  const env = body as { data?: unknown } | null | undefined;
  return (env?.data ?? body) as T;
}

const base = (clientId: string): string => `/clients/${encodeURIComponent(clientId)}/portal-contacts`;

export const portalContactsService = {
  async list(clientId: string): Promise<PortalContact[]> {
    const res = await apiClient.get<unknown>(base(clientId));
    return unwrap<PortalContact[] | null>(res.data) ?? [];
  },
  async create(clientId: string, data: { email: string; name: string }): Promise<PortalContact> {
    const res = await apiClient.post<unknown>(base(clientId), data);
    return unwrap<PortalContact>(res.data);
  },
  async update(
    clientId: string,
    contactId: string,
    data: { name?: string; isActive?: boolean },
  ): Promise<PortalContact> {
    const res = await apiClient.patch<unknown>(`${base(clientId)}/${encodeURIComponent(contactId)}`, data);
    return unwrap<PortalContact>(res.data);
  },
  async remove(clientId: string, contactId: string): Promise<void> {
    await apiClient.delete(`${base(clientId)}/${encodeURIComponent(contactId)}`);
  },
  async invite(clientId: string, contactId: string): Promise<void> {
    await apiClient.post(`${base(clientId)}/${encodeURIComponent(contactId)}/invite`);
  },
};
