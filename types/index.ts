export interface ContentTreeItem {
  itemId: string;
  name: string;
  displayName: string;
  path: string;
  language: string;
  templateName: string;
  templateId: string;
  workflowState: string;
  workflowStateName: string;
  workflowId: string;
  hasChildren: boolean;
  children: ContentTreeItem[];
  isExpanded: boolean;
  isLoaded: boolean;
  depth: number;
}

export interface SelectedItem {
  itemId: string;
  name: string;
  path: string;
  language: string;
  workflowStateName: string;
}

export interface WorkflowCommand {
  id: string;
  name: string;
}

export interface WorkflowTransitionResult {
  itemId: string;
  itemName: string;
  itemPath: string;
  success: boolean;
  error?: string;
}

export interface ExecutionProgress {
  total: number;
  completed: number;
  results: WorkflowTransitionResult[];
  isRunning: boolean;
  isDone: boolean;
}

export interface FilterState {
  templateName: string;
  workflowState: string;
  language: string;
  searchText: string;
}

export interface WorkflowStateInfo {
  stateId: string;
  stateName: string;
}