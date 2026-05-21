import {
  Building2,
  Crown,
  LayoutDashboard,
  ShieldCheck,
  Users,
} from "lucide-react";

export const roles = [
  {
    name: "Leader",
    route: "/leader-dashboard",
    layer: "Personal learning + responsibility signals",
    description: "Personal learning, growth profile, assessments, certificates, activity, and readiness signals.",
    inviteOnly: false,
    icon: Users,
  },
  {
    name: "Campus Pastor",
    route: "/campus-dashboard",
    layer: "Personal learning + campus oversight",
    description: "Personal learning with campus participation, inactive leaders, engagement, mentorship, and department performance.",
    inviteOnly: true,
    icon: Building2,
  },
  {
    name: "Subgroup Pastor",
    route: "/subgroup-dashboard",
    layer: "Personal learning + subgroup oversight",
    description: "Personal learning with subgroup health, campus comparisons, leadership performance, and campus participation trends.",
    inviteOnly: true,
    icon: ShieldCheck,
  },
  {
    name: "Group Pastor",
    route: "/group-dashboard",
    layer: "Personal learning + group oversight",
    description: "Personal learning with strategic ministry intelligence, subgroup analytics, leadership pipeline visibility, and campus growth signals.",
    inviteOnly: true,
    icon: Crown,
  },
  {
    name: "Admin",
    route: "/dashboard",
    layer: "Personal learning + academy oversight",
    description: "Personal learning with academy-wide learning quality, participation, certification velocity, and stewardship controls.",
    inviteOnly: true,
    icon: LayoutDashboard,
  },
];

export const invitationProfiles = [
  {
    name: "Pastor Adeolu Osinuga",
    role: "Campus Pastor",
    assignment: "Ilupeju Campus",
    invitedBy: "Pastor Gbenga Agboola",
  },
  {
    name: "Pastor Gbenga Agboola",
    role: "Subgroup Pastor",
    assignment: "Magodo Subgroup",
    invitedBy: "Pastor Mayowa Agboade",
  },
  {
    name: "Pastor Mayowa Agboade",
    role: "Group Pastor",
    assignment: "Group Alpha",
    invitedBy: "Harvesters Executive Office",
  },
];
