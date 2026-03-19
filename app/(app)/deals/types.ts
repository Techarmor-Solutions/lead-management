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

export interface StageHistory {
  id: string;
  dealId: string;
  columnId: string;
  enteredAt: string;
  exitedAt: string | null;
  column: { name: string; color: string; isClosedStage: boolean };
}

export interface Deal {
  id: string;
  title: string;
  value: number | null;
  notes: string | null;
  closeDate: string | null;
  columnId: string;
  position: number;
  createdAt: string;
  contacts: DealContactEntry[];
  stageHistory: StageHistory[];
}

export interface Column {
  id: string;
  name: string;
  color: string;
  position: number;
  isClosedStage: boolean;
  deals: Deal[];
}
