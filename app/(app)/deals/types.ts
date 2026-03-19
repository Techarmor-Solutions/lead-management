export interface DealContactEntry {
  id: string;
  dealId: string;
  contactId: string;
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    company: { name: string } | null;
  };
}

export interface Deal {
  id: string;
  title: string;
  value: number | null;
  notes: string | null;
  columnId: string;
  position: number;
  contacts: DealContactEntry[];
}

export interface Column {
  id: string;
  name: string;
  color: string;
  position: number;
  deals: Deal[];
}
