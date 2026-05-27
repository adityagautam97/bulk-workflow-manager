import marketplaceManifest from "@/marketplace-manifest.json";

export const APP_STUDIO_URL = "https://portal.sitecorecloud.io/app-studio";

export type ExtensionPoint =
  | "standalone"
  | "xmc:pages:contextpanel"
  | "xmc:pages:customfield"
  | "xmc:dashboardblocks"
  | "xmc:fullscreen";

export interface InstallGuideChoice {
  label: string;
  selected: boolean;
  reason: string;
}

export interface InstallGuideProfile {
  appName: string;
  appTypeLabel: string;
  extensionPoint: ExtensionPoint;
  extensionLabel: string;
  registerDesc: string;
  installOpenDesc: string;
  apiAccess: InstallGuideChoice[];
  permissions: InstallGuideChoice[];
}

export interface SetupStep {
  title: string;
  description: string;
  value?: string;
  copyableValue?: string;
  linkLabel?: string;
  linkHref?: string;
  choices?: InstallGuideChoice[];
}

const EXTENSION_LABELS: Record<ExtensionPoint, string> = {
  standalone: "Standalone",
  "xmc:pages:contextpanel": "Page Context Panel",
  "xmc:pages:customfield": "Custom Field",
  "xmc:dashboardblocks": "Dashboard Widgets",
  "xmc:fullscreen": "Full Screen",
};

const EXTENSION_INSTRUCTIONS: Record<
  ExtensionPoint,
  { registerDesc: string; installOpenDesc: string }
> = {
  standalone: {
    registerDesc:
      "Choose the Standalone extension point so the app appears in the Cloud Portal app launcher.",
    installOpenDesc:
      "After installing, open the app from the Cloud Portal app launcher.",
  },
  "xmc:fullscreen": {
    registerDesc:
      "Choose the Full Screen extension point so the app opens from Sitecore navigation.",
    installOpenDesc:
      "After installing, open the app from Sitecore navigation.",
  },
  "xmc:dashboardblocks": {
    registerDesc:
      "Choose the Dashboard Widgets extension point so the app can be added to an SitecoreAI dashboard.",
    installOpenDesc:
      "After installing, add the widget to your SitecoreAI dashboard and open it there.",
  },
  "xmc:pages:contextpanel": {
    registerDesc:
      "Choose the Page Context Panel extension point so the app appears in the Pages editor context panel.",
    installOpenDesc:
      "After installing, open a page in the Pages editor and find the app in the context panel.",
  },
  "xmc:pages:customfield": {
    registerDesc:
      "Choose the Custom Field extension point so the app can be attached to a page template field.",
    installOpenDesc:
      "After installing, add the custom field to a page template and then edit pages in the Pages editor.",
  },
};

function getExtensionPointFromManifest(): ExtensionPoint {
  const extensionPoint = Array.isArray(marketplaceManifest.extensionPoints)
    ? marketplaceManifest.extensionPoints[0]
    : undefined;

  switch (extensionPoint) {
    case "xmc:pages:contextpanel":
    case "xmc:pages:customfield":
    case "xmc:dashboardblocks":
    case "xmc:fullscreen":
    case "standalone":
      return extensionPoint;
    default:
      return "standalone";
  }
}

function usesSitecoreApis(): boolean {
  return Array.isArray(marketplaceManifest.permissions)
    ? marketplaceManifest.permissions.some(
        (permission) =>
          typeof permission === "string" &&
          (permission.startsWith("xmc:") || permission.startsWith("sitecore"))
      )
    : false;
}

export function buildInstallGuideProfileFromManifest(): InstallGuideProfile {
  const extensionPoint = getExtensionPointFromManifest();
  const instructions = EXTENSION_INSTRUCTIONS[extensionPoint];
  const appName =
    typeof marketplaceManifest.name === "string" &&
    marketplaceManifest.name.trim().length > 0
      ? marketplaceManifest.name
      : "Generated Marketplace App";

  return {
    appName,
    appTypeLabel: "Custom app",
    extensionPoint,
    extensionLabel: EXTENSION_LABELS[extensionPoint],
    registerDesc: instructions.registerDesc,
    installOpenDesc: instructions.installOpenDesc,
    apiAccess: [
      {
        label: "SitecoreAI APIs",
        selected: usesSitecoreApis(),
        reason: usesSitecoreApis()
          ? "Selected because this app requests Sitecore authoring, preview, or live content access."
          : "Leave unselected if this generated app does not request Sitecore API permissions.",
      },
      {
        label: "AI skills APIs",
        selected: false,
        reason:
          "Leave unselected. This generated app does not currently infer AI skills API usage from the selected features.",
      },
    ],
    permissions: [
      {
        label: "Pop-ups",
        selected: true,
        reason:
          "Selected because the generated setup guide can open App Studio and related links in a new tab.",
      },
      {
        label: "Copy to clipboard",
        selected: true,
        reason:
          "Selected because the generated setup guide includes copy actions for the app name and deployment URL.",
      },
      {
        label: "Read from clipboard",
        selected: false,
        reason:
          "Leave unselected unless you intentionally add pasted-input behavior that reads from the clipboard.",
      },
    ],
  };
}

export function buildSetupStepsFromManifest(
  deploymentUrl: string
): SetupStep[] {
  const profile = buildInstallGuideProfileFromManifest();

  return [
    {
      title: "Create the app entry",
      description:
        "In App Studio, choose " +
        profile.appTypeLabel +
        " and use the app name below when creating the app.",
      value: profile.appName,
      copyableValue: profile.appName,
      linkLabel: "Open App Studio",
      linkHref: APP_STUDIO_URL,
    },
    {
      title: "Open the app configuration",
      description:
        "After creating the app, App Studio redirects you to the new entry. Open that app entry again any time you need to update its configuration.",
    },
    {
      title: "Select extension point",
      description: profile.registerDesc,
      value: profile.extensionLabel,
      copyableValue: profile.extensionLabel,
    },
    {
      title: "Select API access",
      description:
        "Under API access, choose the options below based on the generated app capabilities.",
      choices: profile.apiAccess,
    },
    {
      title: "Select app permissions",
      description:
        "Under permissions, enable only the toggles below that the generated app is expected to use.",
      choices: profile.permissions,
    },
    {
      title: "Paste the deployment URL",
      description: "Use the deployment URL below in the URL field.",
      value: deploymentUrl,
      copyableValue: deploymentUrl,
    },
    {
      title: "Upload an app logo",
      description:
        "Upload one square JPG, PNG, or SVG logo file. The maximum file size is 4MB.",
    },
    {
      title: "Activate the app",
      description:
        "After configuration is complete, click Activate in App Studio.",
    },
    {
      title: "Install and open",
      description:
        "After activating, install the app to the desired instance. " +
        profile.installOpenDesc,
    },
  ];
}
