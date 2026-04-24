export interface ItemInput {
  name: string;
  description: string;
  price: number;
}

export interface BenchmarkItem extends ItemInput {
  id: number;
  updatedAt: string;
}

export interface WriteTask extends ItemInput {
  requestedAt: string;
}
