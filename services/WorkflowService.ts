import type { ClientSDK } from "@sitecore-marketplace-sdk/client";
import type {
  ContentTreeItem,
  WorkflowCommand,
  WorkflowTransitionResult,
} from "@/types";

// LGIHomes Workflow Definition
const LGIHOMES_WORKFLOW_ID = "{147E1ED8-3027-40DA-9647-C5C5886A2734}";

const WORKFLOW_STATES: Record<string, string> = {
  "08bc4a4d-5f9e-42bb-8218-74dd24f61310": "Draft",
  "e1fa22c6-9226-4909-ba05-c0bf5cc850c8": "Awaiting Approval",
  "65ed77cf-ddb0-48b7-92ad-8668415623ea": "Content Review",
  "d7c975e2-4f04-4858-889e-6990c4d22dab": "Approved",
};

const WORKFLOW_STATE_GUIDS = {
  DRAFT: "{08BC4A4D-5F9E-42BB-8218-74DD24F61310}",
  AWAITING_APPROVAL: "{E1FA22C6-9226-4909-BA05-C0BF5CC850C8}",
  CONTENT_REVIEW: "{65ED77CF-DDB0-48B7-92AD-8668415623EA}",
  APPROVED: "{D7C975E2-4F04-4858-889E-6990C4D22DAB}",
};

export class WorkflowService {
  private client: ClientSDK;
  private previewContextId: string | null = null;

  constructor(client: ClientSDK) {
    this.client = client;
  }

  async initialize(): Promise<void> {
    if (this.previewContextId) return;
    const { data } = await this.client.query("application.context");
    const appContext = data as Record<string, unknown>;
    const resourceAccess = appContext.resourceAccess as Array<{
      context: { preview: string };
    }>;
    this.previewContextId = resourceAccess?.[0]?.context?.preview ?? null;
  }

  private async ensureContext(): Promise<string> {
    if (!this.previewContextId) {
      await this.initialize();
    }
    if (!this.previewContextId) {
      throw new Error("Failed to obtain preview context ID");
    }
    return this.previewContextId;
  }

  async fetchChildren(
    parentPath: string,
    language: string,
    depth: number
  ): Promise<ContentTreeItem[]> {
    const contextId = await this.ensureContext();

    // Use explicit field() lookups for system workflow fields since they are not
    // returned by the generic fields { nodes { ... } } collection.
    const query = `
      query GetChildren($path: String!, $language: String!) {
        item(where: { path: $path, language: $language }) {
          children {
            nodes {
              itemId
              name
              displayName
              path
              workflowState: field(name: "__Workflow state") {
                value
              }
              workflow: field(name: "__Workflow") {
                value
              }
              fields {
                nodes {
                  name
                  value
                }
              }
              children {
                nodes {
                  itemId
                }
              }
            }
          }
        }
      }
    `;

    const response = await this.client.mutate("xmc.authoring.graphql", {
      params: {
        query: { sitecoreContextId: contextId },
        body: {
          query,
          variables: { path: parentPath, language },
        },
      },
    });

    const responseData = response?.data as Record<string, unknown>;
    const innerData = (responseData?.data ?? responseData) as Record<
      string,
      unknown
    >;
    const item = innerData?.item as Record<string, unknown> | null;
    const children = item?.children as { nodes: Array<Record<string, unknown>> } | null;
    const nodes = children?.nodes ?? [];

    return nodes.map((node) => {
      // Extract workflow fields from the explicit field() aliases
      const workflowStateField = node.workflowState as { value: string } | null;
      const workflowField = node.workflow as { value: string } | null;
      const workflowStateValue = workflowStateField?.value ?? "";
      const workflowIdValue = workflowField?.value ?? "";

      // Fallback: also check generic fields collection in case the explicit
      // field aliases are not supported by the schema version
      const fields = node.fields as {
        nodes: Array<{ name: string; value: string }>;
      } | null;
      const fieldNodes = fields?.nodes ?? [];

      const getFieldValue = (fieldName: string): string => {
        const field = fieldNodes.find(
          (f) => f.name.toLowerCase() === fieldName.toLowerCase()
        );
        return field?.value ?? "";
      };

      const finalWorkflowState = workflowStateValue || getFieldValue("__Workflow state");
      const finalWorkflowId = workflowIdValue || getFieldValue("__Workflow");

      const templateName = this.extractTemplateName(
        (node.path as string) ?? ""
      );

      const childNodes = node.children as {
        nodes: Array<Record<string, unknown>>;
      } | null;
      const hasChildren = (childNodes?.nodes?.length ?? 0) > 0;

      return {
        itemId: (node.itemId as string) ?? "",
        name: (node.name as string) ?? "",
        displayName: (node.displayName as string) || (node.name as string) || "",
        path: (node.path as string) ?? "",
        language,
        templateName,
        templateId: "",
        workflowState: finalWorkflowState,
        workflowStateName: this.parseWorkflowStateName(finalWorkflowState),
        workflowId: finalWorkflowId,
        hasChildren,
        children: [],
        isExpanded: false,
        isLoaded: false,
        depth,
      };
    });
  }

  async fetchItemWithWorkflow(
    path: string,
    language: string
  ): Promise<ContentTreeItem | null> {
    const contextId = await this.ensureContext();

    // Use explicit field() lookups for system workflow fields
    const query = `
      query GetItem($path: String!, $language: String!) {
        item(where: { path: $path, language: $language }) {
          itemId
          name
          displayName
          path
          workflowState: field(name: "__Workflow state") {
            value
          }
          workflow: field(name: "__Workflow") {
            value
          }
          fields {
            nodes {
              name
              value
            }
          }
          children {
            nodes {
              itemId
            }
          }
        }
      }
    `;

    const response = await this.client.mutate("xmc.authoring.graphql", {
      params: {
        query: { sitecoreContextId: contextId },
        body: {
          query,
          variables: { path, language },
        },
      },
    });

    const responseData = response?.data as Record<string, unknown>;
    const innerData = (responseData?.data ?? responseData) as Record<
      string,
      unknown
    >;
    const item = innerData?.item as Record<string, unknown> | null;

    if (!item) return null;

    // Extract workflow fields from the explicit field() aliases
    const workflowStateField = item.workflowState as { value: string } | null;
    const workflowField = item.workflow as { value: string } | null;
    const workflowStateValue = workflowStateField?.value ?? "";
    const workflowIdValue = workflowField?.value ?? "";

    // Fallback: also check generic fields collection
    const fields = item.fields as {
      nodes: Array<{ name: string; value: string }>;
    } | null;
    const fieldNodes = fields?.nodes ?? [];

    const getFieldValue = (fieldName: string): string => {
      const field = fieldNodes.find(
        (f) => f.name.toLowerCase() === fieldName.toLowerCase()
      );
      return field?.value ?? "";
    };

    const finalWorkflowState = workflowStateValue || getFieldValue("__Workflow state");
    const finalWorkflowId = workflowIdValue || getFieldValue("__Workflow");

    const childNodes = item.children as {
      nodes: Array<Record<string, unknown>>;
    } | null;
    const hasChildren = (childNodes?.nodes?.length ?? 0) > 0;

    return {
      itemId: (item.itemId as string) ?? "",
      name: (item.name as string) ?? "",
      displayName: (item.displayName as string) || (item.name as string) || "",
      path: (item.path as string) ?? "",
      language,
      templateName: this.extractTemplateName((item.path as string) ?? ""),
      templateId: "",
      workflowState: finalWorkflowState,
      workflowStateName: this.parseWorkflowStateName(finalWorkflowState),
      workflowId: finalWorkflowId,
      hasChildren,
      children: [],
      isExpanded: false,
      isLoaded: false,
      depth: 0,
    };
  }

  async executeWorkflowCommand(
    itemId: string,
    itemName: string,
    itemPath: string,
    language: string,
    commandId: string,
    comment: string
  ): Promise<WorkflowTransitionResult> {
    try {
      const contextId = await this.ensureContext();

      // Workflow state transitions are executed by updating the __Workflow state field
      // to the target state GUID. We also ensure the __Workflow field is set to the
      // LGIHomes Workflow ID so the item is properly associated with the workflow.
      const mutation = `
        mutation UpdateItemById(
          $itemId: ID!
          $language: String!
          $fields: [FieldValueInput!]!
        ) {
          updateItem(
            input: {
              itemId: $itemId
              language: $language
              fields: $fields
            }
          ) {
            item {
              itemId
              path
            }
          }
        }
      `;

      const fields = [
        { name: "__Workflow", value: LGIHOMES_WORKFLOW_ID },
        { name: "__Workflow state", value: commandId },
      ];

      if (comment) {
        fields.push({ name: "__Workflow comment", value: comment });
      }

      const response = await this.client.mutate("xmc.authoring.graphql", {
        params: {
          query: { sitecoreContextId: contextId },
          body: {
            query: mutation,
            variables: {
              itemId,
              language,
              fields,
            },
          },
        },
      });

      const responseData = response?.data as Record<string, unknown>;
      const innerData = (responseData?.data ?? responseData) as Record<
        string,
        unknown
      >;
      const updateItem = innerData?.updateItem as Record<string, unknown> | null;

      if (updateItem?.item) {
        return { itemId, itemName, itemPath, success: true };
      }

      // Check for errors in response
      const errors = (responseData?.errors ?? innerData?.errors) as
        | Array<{ message: string }>
        | undefined;
      if (errors && errors.length > 0) {
        return {
          itemId,
          itemName,
          itemPath,
          success: false,
          error: errors.map((e) => e.message).join("; "),
        };
      }

      return { itemId, itemName, itemPath, success: true };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      return {
        itemId,
        itemName,
        itemPath,
        success: false,
        error: errorMessage,
      };
    }
  }

  private parseWorkflowStateName(stateValue: string): string {
    if (!stateValue) return "No Workflow";
    // Strip braces and lowercase for lookup
    const cleanValue = stateValue.replace(/[{}]/g, "").toLowerCase();

    // Look up in LGIHomes Workflow states
    const knownState = WORKFLOW_STATES[cleanValue];
    if (knownState) return knownState;

    // If the value doesn't match any known state, return as-is
    return stateValue;
  }

  private extractTemplateName(path: string): string {
    const parts = path.split("/");
    return parts.length > 3 ? parts[parts.length - 1] : "Item";
  }

  getAvailableWorkflowCommands(): WorkflowCommand[] {
    // LGIHomes Workflow state transitions.
    // Each "command" here sets the item's __Workflow state to the target state GUID.
    // The commands represent the available workflow state transitions:
    //   Draft → Awaiting Approval → Content Review → Approved
    // Authors can also move items back to earlier states (e.g., reject back to Draft).
    return [
      {
        id: WORKFLOW_STATE_GUIDS.DRAFT,
        name: "Move to Draft",
      },
      {
        id: WORKFLOW_STATE_GUIDS.AWAITING_APPROVAL,
        name: "Submit for Approval",
      },
      {
        id: WORKFLOW_STATE_GUIDS.CONTENT_REVIEW,
        name: "Send to Content Review",
      },
      {
        id: WORKFLOW_STATE_GUIDS.APPROVED,
        name: "Approve",
      },
    ];
  }
}