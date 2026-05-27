"use client";

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import type { ClientSDK } from "@sitecore-marketplace-sdk/client";
import { usePageContext } from "@/hooks/usePageContext";
import { WorkflowService } from "@/services/WorkflowService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import {
  Search,
  Loader2,
  Check,
  X,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Folder,
  FileText,
  CheckSquare,
  Square,
  MinusSquare,
  AlertCircle,
  Play,
  Filter,
} from "lucide-react";
import type {
  ContentTreeItem,
  SelectedItem,
  WorkflowCommand,
  WorkflowTransitionResult,
  ExecutionProgress,
  FilterState,
} from "@/types";

// ─── Filter matching helpers ───────────────────────────────────────

function itemMatchesFilter(item: ContentTreeItem, filters: FilterState): boolean {
  if (
    filters.searchText &&
    !item.name.toLowerCase().includes(filters.searchText.toLowerCase()) &&
    !item.displayName.toLowerCase().includes(filters.searchText.toLowerCase())
  ) {
    return false;
  }
  if (filters.workflowState && filters.workflowState !== "all") {
    const filterState = filters.workflowState.toLowerCase();
    const itemState = item.workflowStateName.toLowerCase();
    if (filterState === "no workflow") {
      if (itemState !== "" && itemState !== "no workflow") {
        return false;
      }
    } else {
      if (itemState !== filterState) {
        return false;
      }
    }
  }
  if (filters.templateName && filters.templateName !== "all") {
    if (
      item.templateName.toLowerCase() !== filters.templateName.toLowerCase()
    ) {
      return false;
    }
  }
  return true;
}

function hasMatchingDescendant(item: ContentTreeItem, filters: FilterState): boolean {
  if (
    !filters.searchText &&
    (!filters.workflowState || filters.workflowState === "all") &&
    (!filters.templateName || filters.templateName === "all")
  ) {
    return true;
  }

  if (item.hasChildren && !item.isLoaded) {
    return true;
  }

  const checkChildren = (children: ContentTreeItem[]): boolean => {
    return children.some((child) => {
      if (itemMatchesFilter(child, filters)) return true;
      if (child.hasChildren && !child.isLoaded) return true;
      return checkChildren(child.children);
    });
  };

  return checkChildren(item.children);
}

// ─── Tree Node Component ───────────────────────────────────────────

function TreeNode({
  item,
  selectedIds,
  onToggleSelect,
  onToggleExpand,
  onSelectAllChildren,
  filters,
}: {
  item: ContentTreeItem;
  selectedIds: Set<string>;
  onToggleSelect: (item: ContentTreeItem) => void;
  onToggleExpand: (item: ContentTreeItem) => void;
  onSelectAllChildren: (item: ContentTreeItem) => void;
  filters: FilterState;
}): React.JSX.Element | null {
  const isSelected = selectedIds.has(item.itemId);
  const hasSelectedChildren = item.children.some(
    (c) =>
      selectedIds.has(c.itemId) ||
      c.children.some((gc) => selectedIds.has(gc.itemId))
  );
  const allChildrenSelected =
    item.children.length > 0 &&
    item.children.every((c) => selectedIds.has(c.itemId));

  const matchesFilter = useMemo(() => itemMatchesFilter(item, filters), [item, filters]);

  const descendantMatches = useMemo(
    () => hasMatchingDescendant(item, filters),
    [item, filters]
  );

  if (!matchesFilter && !descendantMatches) {
    return null;
  }

  const isAncestorOnly = !matchesFilter && descendantMatches;

  const workflowBadgeVariant = (): "default" | "secondary" | "destructive" => {
    const state = item.workflowStateName.toLowerCase();
    if (state === "approved") return "default";
    if (state === "draft" || state === "no workflow") return "secondary";
    if (state === "awaiting approval") return "destructive";
    if (state === "content review") return "default";
    return "secondary";
  };

  const workflowBadgeClass = (): string => {
    const state = item.workflowStateName.toLowerCase();
    if (state === "approved")
      return "bg-green-100 text-green-800 border-green-200 hover:bg-green-100";
    if (state === "content review")
      return "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100";
    if (state === "awaiting approval")
      return "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100";
    if (state === "draft")
      return "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100";
    return "";
  };

  return (
    <div className="select-none">
      <div
        className={`flex items-center gap-1 py-1 px-1 rounded-md hover:bg-muted/50 transition-colors group ${
          isSelected ? "bg-muted" : ""
        } ${isAncestorOnly ? "opacity-60" : ""}`}
        style={{ paddingLeft: `${item.depth * 16 + 4}px` }}
      >
        {/* Expand/collapse */}
        {item.hasChildren ? (
          <button
            onClick={() => onToggleExpand(item)}
            className="shrink-0 p-0.5 rounded hover:bg-muted"
            aria-label={item.isExpanded ? "Collapse" : "Expand"}
          >
            {item.isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
        ) : (
          <span className="w-[18px] shrink-0" />
        )}

        {/* Checkbox */}
        <button
          onClick={() => onToggleSelect(item)}
          className="shrink-0 p-0.5 rounded hover:bg-muted"
          aria-label={isSelected ? "Deselect" : "Select"}
        >
          {isSelected ? (
            <CheckSquare className="h-4 w-4 text-primary" />
          ) : hasSelectedChildren ? (
            <MinusSquare className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Square className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {/* Icon */}
        <span className="shrink-0">
          {item.hasChildren ? (
            item.isExpanded ? (
              <FolderOpen className="h-3.5 w-3.5 text-amber-500" />
            ) : (
              <Folder className="h-3.5 w-3.5 text-amber-500" />
            )
          ) : (
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </span>

        {/* Item info */}
        <div className="flex-1 min-w-0 flex flex-col gap-0">
          <span className="text-xs font-medium truncate leading-tight">
            {item.displayName || item.name}
          </span>
          <div className="flex items-center gap-1 flex-wrap">
            {item.workflowStateName &&
              item.workflowStateName !== "No Workflow" && (
                <Badge
                  variant={workflowBadgeVariant()}
                  className={`text-[9px] px-1 py-0 leading-tight h-auto border ${workflowBadgeClass()}`}
                >
                  {item.workflowStateName}
                </Badge>
              )}
            <span className="text-[9px] text-muted-foreground">
              {item.language}
            </span>
          </div>
        </div>

        {/* Select all children button (visible on hover) */}
        {item.hasChildren && item.isExpanded && item.children.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectAllChildren(item);
            }}
            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            title={
              allChildrenSelected
                ? "Deselect all children"
                : "Select all children"
            }
          >
            {allChildrenSelected ? (
              <MinusSquare className="h-3 w-3" />
            ) : (
              <CheckSquare className="h-3 w-3" />
            )}
          </button>
        )}
      </div>

      {/* Children */}
      {item.isExpanded && item.children.length > 0 && (
        <div>
          {item.children.map((child) => (
            <TreeNode
              key={child.itemId}
              item={child}
              selectedIds={selectedIds}
              onToggleSelect={onToggleSelect}
              onToggleExpand={onToggleExpand}
              onSelectAllChildren={onSelectAllChildren}
              filters={filters}
            />
          ))}
        </div>
      )}

      {/* Loading indicator for expanding */}
      {item.isExpanded && !item.isLoaded && item.hasChildren && (
        <div
          className="flex items-center gap-2 py-1 text-xs text-muted-foreground"
          style={{ paddingLeft: `${(item.depth + 1) * 16 + 4}px` }}
        >
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading...
        </div>
      )}
    </div>
  );
}

// ─── Results Panel Component ───────────────────────────────────────

function ResultsPanel({
  progress,
  onClose,
}: {
  progress: ExecutionProgress;
  onClose: () => void;
}): React.JSX.Element {
  const successCount = progress.results.filter((r) => r.success).length;
  const failCount = progress.results.filter((r) => !r.success).length;

  return (
    <Card className="border-t-2">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">
            {progress.isDone ? "Execution Complete" : "Executing..."}
          </CardTitle>
          {progress.isDone && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              progress.isDone && failCount > 0
                ? "bg-amber-500"
                : progress.isDone
                ? "bg-green-500"
                : "bg-primary"
            }`}
            style={{
              width: `${
                progress.total > 0
                  ? (progress.completed / progress.total) * 100
                  : 0
              }%`,
            }}
          />
        </div>
        <div className="text-xs text-muted-foreground">
          {progress.completed} of {progress.total} items processed
        </div>

        {/* Summary */}
        {progress.isDone && (
          <div className="flex gap-3 text-xs">
            <div className="flex items-center gap-1 text-green-600">
              <Check className="h-3.5 w-3.5" />
              {successCount} succeeded
            </div>
            {failCount > 0 && (
              <div className="flex items-center gap-1 text-destructive">
                <X className="h-3.5 w-3.5" />
                {failCount} failed
              </div>
            )}
          </div>
        )}

        {/* Results list */}
        <div className="max-h-36 overflow-y-auto space-y-1">
          {progress.results.map((result, idx) => (
            <div
              key={`${result.itemId}-${idx}`}
              className="flex items-center gap-2 text-xs py-0.5"
            >
              {result.success ? (
                <Check className="h-3 w-3 text-green-600 shrink-0" />
              ) : (
                <X className="h-3 w-3 text-destructive shrink-0" />
              )}
              <span className="truncate flex-1">{result.itemName}</span>
              {result.error && (
                <span
                  className="text-destructive truncate max-w-[120px]"
                  title={result.error}
                >
                  {result.error}
                </span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main AppFeature Component ─────────────────────────────────────

export function AppFeature({ client }: { client: ClientSDK }): React.JSX.Element {
  const { pageContext, isLoading: pageLoading } = usePageContext(client);
  const serviceRef = useRef<WorkflowService | null>(null);

  const [treeItems, setTreeItems] = useState<ContentTreeItem[]>([]);
  const [rootItem, setRootItem] = useState<ContentTreeItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoadingTree, setIsLoadingTree] = useState(false);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState<FilterState>({
    templateName: "all",
    workflowState: "all",
    language: "",
    searchText: "",
  });

  const [selectedCommand, setSelectedCommand] = useState<string>("");
  const [commands, setCommands] = useState<WorkflowCommand[]>([]);
  const [progress, setProgress] = useState<ExecutionProgress | null>(null);

  // Initialize service
  const getService = useCallback((): WorkflowService => {
    if (!serviceRef.current) {
      serviceRef.current = new WorkflowService(client);
    }
    return serviceRef.current;
  }, [client]);

  // Gather all unique workflow states and template names from tree for filter dropdowns
  const { uniqueStates, uniqueTemplates } = useMemo(() => {
    const states = new Set<string>();
    const templates = new Set<string>();

    const traverse = (items: ContentTreeItem[]): void => {
      for (const item of items) {
        if (item.workflowStateName && item.workflowStateName !== "No Workflow") {
          states.add(item.workflowStateName);
        }
        if (item.templateName) {
          templates.add(item.templateName);
        }
        traverse(item.children);
      }
    };

    if (rootItem) {
      if (
        rootItem.workflowStateName &&
        rootItem.workflowStateName !== "No Workflow"
      ) {
        states.add(rootItem.workflowStateName);
      }
      if (rootItem.templateName) {
        templates.add(rootItem.templateName);
      }
    }
    traverse(treeItems);

    return {
      uniqueStates: Array.from(states).sort(),
      uniqueTemplates: Array.from(templates).sort(),
    };
  }, [treeItems, rootItem]);

  // Build selected items list
  const selectedItems = useMemo((): SelectedItem[] => {
    const items: SelectedItem[] = [];

    const traverse = (treeNodes: ContentTreeItem[]): void => {
      for (const node of treeNodes) {
        if (selectedIds.has(node.itemId)) {
          items.push({
            itemId: node.itemId,
            name: node.displayName || node.name,
            path: node.path,
            language: node.language,
            workflowStateName: node.workflowStateName,
          });
        }
        traverse(node.children);
      }
    };

    if (rootItem && selectedIds.has(rootItem.itemId)) {
      items.push({
        itemId: rootItem.itemId,
        name: rootItem.displayName || rootItem.name,
        path: rootItem.path,
        language: rootItem.language,
        workflowStateName: rootItem.workflowStateName,
      });
    }
    traverse(treeItems);

    return items;
  }, [selectedIds, treeItems, rootItem]);

  // Load root content tree
  const loadTree = useCallback(async (): Promise<void> => {
    const sitePath = pageContext?.pageInfo?.path || "/sitecore/content";
    const language = pageContext?.siteInfo?.language || "en";

    setIsLoadingTree(true);
    setTreeError(null);
    setSelectedIds(new Set());

    try {
      const service = getService();
      await service.initialize();

      // Determine root path: go up to the site root (content folder)
      const pathParts = sitePath.split("/");
      let rootPath = "/sitecore/content";
      if (pathParts.length >= 4) {
        rootPath = pathParts.slice(0, 4).join("/");
      }

      // Fetch root item info
      const rootItemData = await service.fetchItemWithWorkflow(
        rootPath,
        language
      );
      if (rootItemData) {
        rootItemData.depth = 0;
        rootItemData.isExpanded = true;
        rootItemData.isLoaded = true;
        setRootItem(rootItemData);
      }

      // Fetch first level children
      const children = await service.fetchChildren(rootPath, language, 1);
      setTreeItems(children);

      // Load commands
      const cmds = service.getAvailableWorkflowCommands();
      setCommands(cmds);

      setFilters((prev) => ({ ...prev, language }));
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to load content tree";
      setTreeError(msg);
    } finally {
      setIsLoadingTree(false);
    }
  }, [pageContext, getService]);

  // Load tree on mount / page context change
  useEffect(() => {
    if (!pageLoading && pageContext) {
      loadTree();
    }
  }, [pageLoading, pageContext, loadTree]);

  // Toggle expand/collapse
  const handleToggleExpand = useCallback(
    async (item: ContentTreeItem): Promise<void> => {
      const language =
        filters.language || pageContext?.siteInfo?.language || "en";

      const updateTree = (
        items: ContentTreeItem[],
        targetId: string,
        updater: (item: ContentTreeItem) => ContentTreeItem
      ): ContentTreeItem[] => {
        return items.map((i) => {
          if (i.itemId === targetId) {
            return updater(i);
          }
          if (i.children.length > 0) {
            return {
              ...i,
              children: updateTree(i.children, targetId, updater),
            };
          }
          return i;
        });
      };

      if (item.isExpanded) {
        // Collapse
        setTreeItems((prev) =>
          updateTree(prev, item.itemId, (i) => ({
            ...i,
            isExpanded: false,
          }))
        );
        return;
      }

      // Expand - load children if not loaded
      if (!item.isLoaded) {
        setTreeItems((prev) =>
          updateTree(prev, item.itemId, (i) => ({
            ...i,
            isExpanded: true,
          }))
        );

        try {
          const service = getService();
          const children = await service.fetchChildren(
            item.path,
            language,
            item.depth + 1
          );
          setTreeItems((prev) =>
            updateTree(prev, item.itemId, (i) => ({
              ...i,
              isExpanded: true,
              isLoaded: true,
              children,
            }))
          );
        } catch {
          setTreeItems((prev) =>
            updateTree(prev, item.itemId, (i) => ({
              ...i,
              isExpanded: false,
              isLoaded: false,
            }))
          );
        }
      } else {
        setTreeItems((prev) =>
          updateTree(prev, item.itemId, (i) => ({
            ...i,
            isExpanded: true,
          }))
        );
      }
    },
    [filters.language, pageContext, getService]
  );

  // Toggle selection
  const handleToggleSelect = useCallback((item: ContentTreeItem): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.itemId)) {
        next.delete(item.itemId);
      } else {
        next.add(item.itemId);
      }
      return next;
    });
  }, []);

  // Select all children
  const handleSelectAllChildren = useCallback(
    (item: ContentTreeItem): void => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        const allSelected = item.children.every((c) => next.has(c.itemId));

        const toggleAll = (
          children: ContentTreeItem[],
          select: boolean
        ): void => {
          for (const child of children) {
            if (select) {
              next.add(child.itemId);
            } else {
              next.delete(child.itemId);
            }
            toggleAll(child.children, select);
          }
        };

        toggleAll(item.children, !allSelected);
        return next;
      });
    },
    []
  );

  // Execute workflow command on all selected items
  const handleExecute = useCallback(async (): Promise<void> => {
    if (!selectedCommand || selectedItems.length === 0) return;

    const executionProgress: ExecutionProgress = {
      total: selectedItems.length,
      completed: 0,
      results: [],
      isRunning: true,
      isDone: false,
    };
    setProgress({ ...executionProgress });

    const service = getService();

    for (const item of selectedItems) {
      const result: WorkflowTransitionResult =
        await service.executeWorkflowCommand(
          item.itemId,
          item.name,
          item.path,
          item.language,
          selectedCommand,
          ""
        );

      executionProgress.completed += 1;
      executionProgress.results.push(result);
      setProgress({ ...executionProgress });
    }

    executionProgress.isRunning = false;
    executionProgress.isDone = true;
    setProgress({ ...executionProgress });
  }, [selectedCommand, selectedItems, getService]);

  // Clear all selections
  const handleClearSelection = useCallback((): void => {
    setSelectedIds(new Set());
  }, []);

  // Get a readable name for the currently selected command
  const selectedCommandName = useMemo((): string => {
    const cmd = commands.find((c) => c.id === selectedCommand);
    return cmd?.name ?? "";
  }, [selectedCommand, commands]);

  // ─── Render ──────────────────────────────────────────────────────

  if (pageLoading || isLoadingTree) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  if (treeError) {
    return (
      <div className="p-4">
        <ErrorDisplay
          title="Failed to load content tree"
          message={treeError}
          onRetry={loadTree}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-h-screen">
      {/* Header */}
      <div className="p-3 border-b space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Bulk Workflow Manager</h2>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setShowFilters(!showFilters)}
              title="Toggle filters"
            >
              <Filter className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={loadTree}
              title="Refresh tree"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Workflow info */}
        <div className="text-[10px] text-muted-foreground">
          Workflow:{" "}
          <span className="font-medium text-foreground">LGIHomes Workflow</span>
        </div>

        {/* Page info */}
        {pageContext?.pageInfo && (
          <div className="text-xs text-muted-foreground">
            Current page:{" "}
            <span className="font-medium">{pageContext.pageInfo.name}</span>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={filters.searchText}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, searchText: e.target.value }))
            }
            className="h-7 text-xs pl-7"
          />
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="space-y-1.5 pt-1">
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Workflow State
              </label>
              <select
                value={filters.workflowState}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    workflowState: e.target.value,
                  }))
                }
                className="w-full h-7 text-xs rounded-md border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="all">All States</option>
                <option value="No Workflow">No Workflow</option>
                <option value="Draft">Draft</option>
                <option value="Awaiting Approval">Awaiting Approval</option>
                <option value="Content Review">Content Review</option>
                <option value="Approved">Approved</option>
                {uniqueStates
                  .filter(
                    (s) =>
                      !["Draft", "Awaiting Approval", "Content Review", "Approved"].includes(s)
                  )
                  .map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Template
              </label>
              <select
                value={filters.templateName}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    templateName: e.target.value,
                  }))
                }
                className="w-full h-7 text-xs rounded-md border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="all">All Templates</option>
                {uniqueTemplates.map((tmpl) => (
                  <option key={tmpl} value={tmpl}>
                    {tmpl}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Language
              </label>
              <Input
                value={filters.language}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, language: e.target.value }))
                }
                placeholder="e.g. en"
                className="h-7 text-xs"
              />
            </div>
          </div>
        )}

        {/* Selection count */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-primary font-medium">
              {selectedIds.size} item{selectedIds.size !== 1 ? "s" : ""}{" "}
              selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSelection}
              className="h-5 text-[10px] px-1.5"
            >
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto p-2 min-h-0">
        {rootItem && (
          <TreeNode
            item={rootItem}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onToggleExpand={async () => {
              // Root item expand toggles showing children
              setRootItem((prev) =>
                prev ? { ...prev, isExpanded: !prev.isExpanded } : prev
              );
            }}
            onSelectAllChildren={() => {
              // For root, select all top-level tree items
              setSelectedIds((prev) => {
                const next = new Set(prev);
                const allSelected = treeItems.every((c) =>
                  next.has(c.itemId)
                );
                for (const child of treeItems) {
                  if (allSelected) {
                    next.delete(child.itemId);
                  } else {
                    next.add(child.itemId);
                  }
                }
                return next;
              });
            }}
            filters={filters}
          />
        )}

        {rootItem?.isExpanded &&
          treeItems.map((item) => (
            <TreeNode
              key={item.itemId}
              item={item}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onToggleExpand={handleToggleExpand}
              onSelectAllChildren={handleSelectAllChildren}
              filters={filters}
            />
          ))}

        {treeItems.length === 0 && !isLoadingTree && (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mb-2" />
            <p className="text-xs">No items found</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadTree}
              className="mt-2 text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Reload
            </Button>
          </div>
        )}
      </div>

      {/* Action Panel */}
      {selectedIds.size > 0 && !progress && (
        <div className="border-t p-3 space-y-2 shrink-0 bg-background">
          <div className="text-xs font-semibold flex items-center gap-1.5">
            <Play className="h-3.5 w-3.5" />
            Workflow Action
          </div>

          {/* Command selection */}
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Transition To
            </label>
            <select
              value={selectedCommand}
              onChange={(e) => setSelectedCommand(e.target.value)}
              className="w-full h-8 text-xs rounded-md border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Select target state...</option>
              {commands.map((cmd) => (
                <option key={cmd.id} value={cmd.id}>
                  {cmd.name}
                </option>
              ))}
            </select>
          </div>

          {/* Execute button */}
          <Button
            className="w-full h-8 text-xs"
            disabled={!selectedCommand}
            onClick={handleExecute}
          >
            <Play className="h-3.5 w-3.5 mr-1.5" />
            {selectedCommandName
              ? `${selectedCommandName} — ${selectedIds.size} item${selectedIds.size !== 1 ? "s" : ""}`
              : `Execute on ${selectedIds.size} item${selectedIds.size !== 1 ? "s" : ""}`}
          </Button>
        </div>
      )}

      {/* Progress / Results Panel */}
      {progress && (
        <div className="shrink-0">
          <ResultsPanel
            progress={progress}
            onClose={() => {
              setProgress(null);
              setSelectedIds(new Set());
              setSelectedCommand("");
              // Reload tree to reflect updated workflow states
              loadTree();
            }}
          />
        </div>
      )}
    </div>
  );
}

export default AppFeature;