// Plain types (no server imports) so client components can use them.

export type PublicOpportunity = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  description: string;
  imageUrl?: string;
  category: string;
  type: string;
  location?: string;
  applicationUrl: string;
  additionalLinks: string[];
  deadline?: Date;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  organization: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string;
  };
};

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};