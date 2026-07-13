export interface Warehouse {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  contact: string;
  phone: string;
  email: string;
  notes: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WarehouseInput {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  contact: string;
  phone: string;
  email: string;
  notes: string;
  isActive: boolean;
}
