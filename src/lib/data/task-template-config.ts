export interface TaskTemplate {
  title: string;
  description?: string;
  subtasks?: string[];
}

// Predefined task templates keyed by workflow step key.
// Each task has an optional list of subtask titles.
// Kept in a plain (non-"use server") module so client components can import it safely.
export const STEP_TASK_TEMPLATES: Record<string, TaskTemplate[]> = {
  // ── Setup ─────────────────────────────────────────────────────────────────
  bomReview: [
    {
      title: "Capture Finishes Approval",
      description: "Obtain customer sign-off on all finish selections (paint, trim, faceplates, equipment color) before purchasing is released.",
      subtasks: [
        "Distribute finishes approval form to customer",
        "Confirm all finish selections are documented",
        "Obtain customer signature / written approval",
        "File approved form in project folder",
      ],
    },
    {
      title: "Publish Purchasing Release",
      description: "Release the approved BOM to Procurement for purchasing after all engineering and finishes approvals are in hand.",
      subtasks: [
        "Confirm BOM is fully approved and finalized",
        "Confirm finishes approval on file",
        "Submit BOM to Procurement with release authorization",
        "Log release date and confirm receipt",
      ],
    },
  ],

  // ── Engineering ──────────────────────────────────────────────────────────
  pullSchedule: [
    {
      title: "Generate Pull Schedule",
      description: "Create a complete cable pull schedule derived from the construction drawings and BOM.",
      subtasks: [
        "Review floor plan and routing drawings",
        "List all cable runs by source and destination",
        "Specify cable type, quantity, and label convention for each run",
        "Cross-reference against BOM to confirm quantities",
      ],
    },
    {
      title: "Review & Distribute Pull Schedule",
      description: "Internal review of the pull schedule, then distribute to the field team.",
      subtasks: [
        "Solutions Engineer reviews for completeness",
        "Incorporate any corrections",
        "Distribute finalized pull schedule to field PM",
      ],
    },
  ],

  ipScopeSwitchports: [
    {
      title: "Define IP Addressing Scheme",
      description: "Document the full IP addressing plan for all networked AV devices on the project.",
      subtasks: [
        "Confirm VLAN and subnet assignments with IT/customer",
        "Assign static IPs to all managed AV devices",
        "Document gateway, DNS, and DHCP scope boundaries",
      ],
    },
    {
      title: "Map Switchport Assignments",
      description: "Assign every networked device to a specific switch and port per the network topology.",
      subtasks: [
        "Reference rack elevation and floor plan drawings",
        "Assign each device to a switch port by location",
        "Document port speed, VLAN tag, and PoE requirements",
        "Cross-reference against switch hardware ordered",
      ],
    },
    {
      title: "Internal Review & Finalize",
      description: "Review the completed IP scope document for accuracy before including in the Engineering Packet.",
      subtasks: [
        "Solutions Engineer reviews all assignments",
        "Confirm no IP conflicts",
        "Finalize and save to project folder",
      ],
    },
  ],

  functionalNarrative: [
    {
      title: "Draft Functional Narrative",
      description: "Write the functional narrative document describing all system behaviors, workflows, and user interactions.",
      subtasks: [
        "Outline all system functions and room modes",
        "Describe source routing and display behavior",
        "Document audio routing, level structure, and presets",
        "Describe control system behaviors and user workflows",
        "Include conferencing and scheduling integration details",
      ],
    },
    {
      title: "Internal Review",
      description: "Route the draft functional narrative for Solutions Engineer review before finalizing.",
      subtasks: [
        "Submit draft for SE review",
        "Incorporate all comments and corrections",
        "Confirm narrative aligns with BOM and drawings",
      ],
    },
    {
      title: "Finalize & Approve",
      description: "Obtain final approval on the functional narrative before it is included in the Engineering Packet.",
      subtasks: [
        "Distribute final version to project team",
        "Confirm no outstanding questions",
        "Log approval and archive final version",
      ],
    },
  ],

  programmingMockups: [
    {
      title: "Create GUI Mockups",
      description: "Design touchpanel and/or software interface mockups per the approved functional narrative.",
      subtasks: [
        "Build main room control page layout",
        "Design source selection and display routing UI",
        "Design audio and volume control UI",
        "Apply customer branding, colors, and logo",
        "Include any scheduling or meeting room UI",
      ],
    },
    {
      title: "Mockup Review & Approval",
      description: "Present mockups for customer and/or internal review. Obtain approval before programming begins.",
      subtasks: [
        "Submit mockups for internal review",
        "Present to customer if required",
        "Collect and incorporate feedback",
        "Obtain written or documented approval",
      ],
    },
  ],

  engineeringPacket: [
    {
      title: "Compile Engineering Packet",
      description: "Assemble all engineering deliverables into a single, organized engineering packet for the project team.",
      subtasks: [
        "Include approved construction drawings",
        "Include finalized IP scope and switchport assignments",
        "Include approved functional narrative",
        "Include pull schedule",
        "Include programming mockups (if applicable)",
        "Include BOM and equipment schedule",
      ],
    },
    {
      title: "Internal Review",
      description: "Conduct a final internal review of the complete engineering packet before submission.",
      subtasks: [
        "Solutions Engineer reviews all included documents",
        "Verify all documents are latest approved versions",
        "Resolve any gaps or inconsistencies",
      ],
    },
    {
      title: "Submit Engineering Packet",
      description: "Distribute the finalized engineering packet to the full project team.",
      subtasks: [
        "Submit packet to Inside PM and Field PM",
        "Submit to Procurement for reference",
        "Confirm receipt from all parties",
        "Archive final version in project folder",
      ],
    },
  ],

  // ── Procurement & Pre-Construction ───────────────────────────────────────
  scheduleResources: [
    {
      title: "Confirm Internal Technician Resources",
      description: "Verify internal technician availability and confirm assignment for the installation.",
      subtasks: [
        "Confirm lead tech assignment with Field PM",
        "Confirm crew size and composition",
        "Block schedule on resource calendar",
      ],
    },
    {
      title: "Engage Subcontractors (if needed)",
      description: "Identify, quote, and confirm any subcontractor resources required for the installation.",
      subtasks: [
        "Determine scope requiring subcontracted labor",
        "Obtain and compare subcontractor quotes",
        "Issue purchase order or work order to selected sub",
        "Confirm sub availability and schedule",
      ],
    },
    {
      title: "Confirm Installation Timeline",
      description: "Lock the installation start date and duration with the full project team and customer.",
      subtasks: [
        "Align field schedule with customer site access",
        "Confirm schedule with Field PM",
        "Communicate timeline to all crew and subs",
      ],
    },
  ],

  onsiteWalkthrough: [
    {
      title: "Schedule Walkthrough",
      description: "Coordinate and schedule the pre-installation walkthrough with the customer and field team.",
      subtasks: [
        "Confirm available dates with customer",
        "Schedule Field PM and lead tech attendance",
        "Send calendar invite to all parties",
      ],
    },
    {
      title: "Conduct Onsite Walkthrough",
      description: "Walk the site with the field team to verify conditions, routing, and infrastructure against the engineering packet.",
      subtasks: [
        "Verify rack locations and mounting surfaces",
        "Walk all cable routing paths",
        "Confirm power and data infrastructure",
        "Verify equipment staging area",
        "Document any deviations from plan",
      ],
    },
    {
      title: "Document & Communicate Findings",
      description: "Summarize walkthrough findings and distribute to the project team for any necessary adjustments.",
      subtasks: [
        "Compile walkthrough notes and photos",
        "Flag any design or logistics issues",
        "Update engineering documents or BOM if deviations found",
        "Distribute summary to project team",
      ],
    },
  ],

  engineeringPacketReview: [
    {
      title: "Distribute Packet to Install Team",
      description: "Ensure the full install team has received and can access the finalized engineering packet.",
      subtasks: [
        "Confirm engineering packet is the final approved version",
        "Distribute to lead tech and all field crew",
        "Confirm receipt from each team member",
      ],
    },
    {
      title: "Engineering Packet Review Session",
      description: "Walk through the engineering packet with the field team to confirm understanding before installation.",
      subtasks: [
        "Review drawings and routing with field team",
        "Walk through IP scope and network configuration",
        "Review functional narrative key points",
        "Address all team questions",
        "Document any clarifications needed from SE",
      ],
    },
    {
      title: "Resolve Open Questions",
      description: "Close out any open questions or gaps identified during the packet review before installation begins.",
      subtasks: [
        "Submit unresolved questions to Solutions Engineer",
        "Obtain and document answers",
        "Confirm field team is clear to proceed",
      ],
    },
  ],

  submitPmReview: [
    {
      title: "Compile PM Review Summary",
      description: "Assemble a project status summary covering budget, procurement, schedule, and readiness for installation.",
      subtasks: [
        "Summarize procurement status (ordered, pending, delivered)",
        "Review labor budget vs. projected hours",
        "Confirm schedule and resource assignments",
        "Note any open risks or change orders",
      ],
    },
    {
      title: "Submit for PM Review",
      description: "Submit the completed PM review summary to senior management or the Inside PM for sign-off.",
      subtasks: [
        "Submit review summary to Inside PM / senior PM",
        "Address any questions or concerns raised",
        "Obtain sign-off or go-ahead for installation",
        "Log review completion date",
      ],
    },
  ],

  // ── Closeout ─────────────────────────────────────────────────────────────
  customerTraining: [
    {
      title: "Schedule Training Session",
      description: "Coordinate and schedule the customer training session with the appropriate end users.",
      subtasks: [
        "Identify training participants with customer POC",
        "Confirm training date and location",
        "Prepare training materials or QR guide",
      ],
    },
    {
      title: "Conduct End-User Training",
      description: "Train onsite staff on day-to-day system operation.",
      subtasks: [
        "Walk through all system functions and room modes",
        "Demonstrate source selection, audio, and conferencing",
        "Walk through scheduling and common scenarios",
        "Answer all user questions",
      ],
    },
    {
      title: "Document Training Completion",
      description: "Record that training was completed and distribute any reference materials.",
      subtasks: [
        "Note attendees and training date",
        "Distribute quick-reference guide or QR code",
        "Log training completion in project folder",
      ],
    },
  ],

  finalDayDocumentation: [
    {
      title: "Complete Final Day Report",
      description: "Submit the daily report for the last day of installation, noting final status and any outstanding items.",
      subtasks: [
        "Document all work completed on final day",
        "Note any outstanding punch list items",
        "Submit daily report to Inside PM",
      ],
    },
    {
      title: "Final Day Photography",
      description: "Photograph the completed installation for project records.",
      subtasks: [
        "Photograph rack front and rear",
        "Photograph all field device installations",
        "Photograph cable dressing and labeling",
        "Upload photos to project folder",
      ],
    },
    {
      title: "Collect As-Built Red Lines",
      description: "Gather any field markups or deviations noted during installation for incorporation into as-built documents.",
      subtasks: [
        "Collect red-lined drawings from field team",
        "Document any IP or configuration changes made in field",
        "Submit red lines to Solutions Engineer for as-built update",
      ],
    },
  ],

  closeoutPacket: [
    {
      title: "Compile As-Built Documentation",
      description: "Finalize all as-built drawings, IP scope, and programming files with field changes incorporated.",
      subtasks: [
        "Update drawings with field red lines",
        "Finalize IP scope with all live device credentials",
        "Upload final programming files",
        "Confirm all documents are latest version",
      ],
    },
    {
      title: "Assemble Closeout Packet",
      description: "Compile the complete closeout package for the customer.",
      subtasks: [
        "Include as-built drawings",
        "Include final IP scope",
        "Include equipment warranties and manuals",
        "Include programming files and system documentation",
        "Include training completion record",
      ],
    },
    {
      title: "Submit Closeout Packet to Customer",
      description: "Deliver the finalized closeout packet to the customer and obtain acknowledgment.",
      subtasks: [
        "Submit packet via agreed delivery method",
        "Confirm customer receipt",
        "Log submission date in project folder",
      ],
    },
  ],

  processRmas: [
    {
      title: "Identify Return Items",
      description: "Identify all items to be returned — over-ordered quantities, defective goods, or wrong-ship items.",
      subtasks: [
        "Review delivered vs. installed quantities",
        "Flag defective or damaged items",
        "Confirm return eligibility with vendor",
      ],
    },
    {
      title: "Initiate RMA Process",
      description: "Open RMAs with vendors for all approved return items.",
      subtasks: [
        "Submit RMA requests to each applicable vendor",
        "Obtain RMA authorization numbers",
        "Coordinate return packaging and shipping labels",
      ],
    },
    {
      title: "Return to Stock / Process Credits",
      description: "Complete physical returns and ensure vendor credits are received and applied.",
      subtasks: [
        "Ship return items with correct documentation",
        "Confirm delivery and vendor receipt",
        "Track and confirm credit memos or restocking fees",
        "Update project cost records accordingly",
      ],
    },
  ],

  cadReview: [
    {
      title: "Drawing Package Review",
      description: "Review all drawings submitted by the engineer or design team for completeness and accuracy.",
      subtasks: [
        "Check floor plan layouts for accuracy",
        "Verify equipment locations match BOM",
        "Review rack elevation drawings",
        "Check cable pathway and routing drawings",
        "Confirm signal flow diagrams",
        "Note any discrepancies or revision requests",
      ],
    },
    {
      title: "Redline / Revision Coordination",
      description: "Consolidate feedback and coordinate revision requests back to the drawing team.",
      subtasks: [
        "Compile all redline comments",
        "Submit revision requests to engineer",
        "Confirm receipt of revision request",
      ],
    },
    {
      title: "Final Drawing Approval",
      description: "Review revised drawings and provide final approval for release to field.",
      subtasks: [
        "Verify all redlines addressed",
        "Confirm drawings are release-ready",
        "Distribute approved drawings to field team",
      ],
    },
  ],
  installation: [
    {
      title: "Pre-Install Walkthrough",
      description: "Confirm onsite conditions, routing paths, and identify any infrastructure gaps before installation begins.",
      subtasks: [
        "Review engineering packet and drawings",
        "Confirm rack locations and mounting surfaces",
        "Identify cable routing paths",
        "Verify power and data infrastructure",
        "Document any deviations from plan",
      ],
    },
    {
      title: "Equipment Staging & Verification",
      description: "Verify all delivered equipment against the BOM before installation begins.",
      subtasks: [
        "Check all items against BOM",
        "Inspect for damage or defects",
        "Stage equipment at install location",
        "Document any missing or damaged items",
      ],
    },
    {
      title: "Cable Pull & Rough-In",
      description: "Pull all signal, power, and control cabling per the pull schedule and drawings.",
      subtasks: [
        "Pull low-voltage signal cables",
        "Pull control system cables",
        "Label cables per drawing conventions",
        "Conduct continuity testing on pulled cables",
      ],
    },
    {
      title: "Rack Build & Equipment Mounting",
      description: "Build and dress the equipment rack; mount all field devices per drawings.",
      subtasks: [
        "Mount rack hardware and panels",
        "Install and dress rack equipment",
        "Mount field devices (displays, speakers, cameras, etc.)",
        "Apply equipment labels",
      ],
    },
    {
      title: "Cable Termination & Patching",
      description: "Terminate all cables at rack and field endpoints; complete patch bay connections.",
      subtasks: [
        "Terminate rack-end connections",
        "Terminate field-end connections",
        "Complete patch panel wiring",
        "Verify all terminations",
      ],
    },
    {
      title: "Network & IT Configuration",
      description: "Configure network switches, assign IP addresses per IP scope, and verify connectivity.",
      subtasks: [
        "Configure managed switches per IP scope",
        "Assign static IPs to AV devices",
        "Verify VLAN assignments",
        "Test network connectivity for all devices",
      ],
    },
  ],
  programming: [
    {
      title: "Functional Narrative Review",
      description: "Review the approved functional narrative to confirm programming requirements before coding begins.",
      subtasks: [
        "Review system functions and user workflows",
        "Confirm GUI design and interface expectations",
        "Identify programming dependencies",
        "Confirm approval before proceeding",
      ],
    },
    {
      title: "Control System Programming",
      description: "Program the control system processor per the functional narrative.",
      subtasks: [
        "Build room logic and source routing",
        "Program device control commands",
        "Implement scheduling and presets",
        "Internal review and testing",
      ],
    },
    {
      title: "GUI Development",
      description: "Build touchpanel and/or software interfaces per approved UX mockups.",
      subtasks: [
        "Build main room control page",
        "Build source selection and display control",
        "Build audio/volume controls",
        "Apply approved branding and color scheme",
        "User acceptance review",
      ],
    },
    {
      title: "DSP & Audio Configuration",
      description: "Configure digital signal processing, routing, and audio presets.",
      subtasks: [
        "Configure input/output routing",
        "Set gain structure and levels",
        "Configure acoustic echo cancellation",
        "Save and document presets",
      ],
    },
    {
      title: "AV-over-IP / Video Distribution Setup",
      description: "Configure video distribution, encoders, decoders, and routing matrix as applicable.",
      subtasks: [
        "Configure encoders and decoders",
        "Set up video routing",
        "Test signal quality on all outputs",
      ],
    },
    {
      title: "Integration & End-to-End Testing",
      description: "Test all system functions together to confirm integrated behavior matches the functional narrative.",
      subtasks: [
        "Test all source selection and routing",
        "Test room presets and scheduling",
        "Test control system to DSP communication",
        "Test remote control and scheduling",
        "Document all issues found",
      ],
    },
  ],
  commissioning: [
    {
      title: "System Power-Up & Device Verification",
      description: "Power up all equipment and verify each device is online and communicating.",
      subtasks: [
        "Power on all rack equipment",
        "Verify all devices are reachable on network",
        "Confirm firmware versions match engineering packet",
        "Resolve any offline or unreachable devices",
      ],
    },
    {
      title: "Audio/Video Signal Path Testing",
      description: "Verify signal flow for all sources and destinations per the functional narrative.",
      subtasks: [
        "Test each video source to all outputs",
        "Test audio signal routing and levels",
        "Verify mic mixing and echo cancellation",
        "Confirm video conferencing A/V quality",
      ],
    },
    {
      title: "Control System Verification",
      description: "Verify all control system commands and feedback work as programmed.",
      subtasks: [
        "Test all touchpanel buttons and feedback",
        "Test room presets and scene recall",
        "Verify scheduling functions",
        "Test all connected device control",
      ],
    },
    {
      title: "Punch List Resolution",
      description: "Document and resolve all issues found during commissioning before customer walkthrough.",
      subtasks: [
        "Compile punch list from commissioning testing",
        "Assign and resolve all punch items",
        "Re-test resolved items",
        "Confirm punch list is clear",
      ],
    },
    {
      title: "Customer Walkthrough & Acceptance",
      description: "Walk the customer through the completed system and obtain sign-off.",
      subtasks: [
        "Demonstrate full system operation",
        "Review functional narrative with customer",
        "Document any customer change requests",
        "Obtain customer signature/acceptance",
      ],
    },
    {
      title: "Training",
      description: "Train onsite staff on day-to-day system operation.",
      subtasks: [
        "Conduct end-user operation training",
        "Walk through common scenarios and workflows",
        "Provide training documentation or QR guide",
      ],
    },
    {
      title: "As-Built Documentation",
      description: "Finalize as-built drawings, IP scope, and programming files with any field changes noted.",
      subtasks: [
        "Update drawings with field red lines",
        "Finalize IP scope with all device credentials",
        "Upload final programming files",
        "Submit as-built package to Project Engineer",
      ],
    },
    {
      title: "Final Day Photos",
      description: "Photograph completed installation for project records.",
      subtasks: [
        "Photograph rack front and rear",
        "Photograph all field device installations",
        "Photograph cable dressing",
        "Upload photos to project folder",
      ],
    },
  ],
};
