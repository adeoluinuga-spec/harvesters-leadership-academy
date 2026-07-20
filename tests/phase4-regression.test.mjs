import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function source(path) {
  return readFileSync(join(root, path), "utf8");
}

describe("role access regression", () => {
  const roles = source("src/lib/roles.ts");

  it("keeps unknown dashboard routes on the least-privilege attendee dashboard", () => {
    assert.match(roles, /dashboardRoutes\[normalizeRole\(role\)\]\s*\?\?\s*"\/dashboard\/attendee"/);
  });

  it("keeps Group Admin in invite-only and admin course roles", () => {
    assert.match(roles, /INVITE_ONLY_ROLES[\s\S]*"Group Admin"/);
    assert.match(roles, /ADMIN_COURSE_ROLES[\s\S]*"Group Admin"/);
  });
});

describe("mock data removal regression", () => {
  it("does not leave deleted fixture modules in source", () => {
    assert.equal(existsSync(join(root, "src/lib/course-data.ts")), false);
    assert.equal(existsSync(join(root, "src/lib/hierarchy-data.ts")), false);
    assert.equal(existsSync(join(root, "src/lib/ai-course-intelligence-data.ts")), false);
  });

  it("does not import removed fixture modules from source files", () => {
    const haystack = [
      source("src/app/analytics/page.tsx"),
      source("src/app/ai-course-intelligence/page.tsx"),
      source("src/app/leaders/[id]/page.tsx"),
      source("src/app/subgroup-dashboard/page.tsx"),
    ].join("\n");

    assert.doesNotMatch(haystack, /course-data|hierarchy-data|ai-course-intelligence-data/);
  });
});

describe("admin course lifecycle hardening", () => {
  const courseApi = source("src/app/api/lms/admin-course-actions/route.ts");
  const courseClient = source("src/lib/course-management.ts");

  it("routes admin course lifecycle actions through scoped server authorization", () => {
    assert.match(courseApi, /requireScopedAdmin/);
    assert.match(courseApi, /canManageCourse/);
    assert.match(courseApi, /scopeForbidden/);
    assert.doesNotMatch(courseClient, /\.from\("courses"\)\.delete/);
    assert.doesNotMatch(courseClient, /\.from\("courses"\)\.update/);
    assert.match(courseClient, /\/api\/lms\/admin-course-actions/);
  });

  it("archives courses with learner history instead of deleting them", () => {
    assert.match(courseApi, /dependentRecords\s*>\s*0/);
    assert.match(courseApi, /status:\s*"archived"/);
    assert.match(courseApi, /archivedInsteadOfDeleted:\s*true/);
  });

  it("records audit events for course create, update, and delete paths", () => {
    assert.match(courseApi, /eventType:\s*"course_created"/);
    assert.match(courseApi, /eventType:\s*"course_updated"/);
    assert.match(courseApi, /eventType:\s*"course_deleted"/);
  });
});

describe("scoped admin structure hardening", () => {
  const adminLib = source("src/app/api/admin/_lib.ts");
  const campuses = source("src/app/api/admin/campuses/route.ts");
  const groups = source("src/app/api/admin/groups/route.ts");
  const subgroups = source("src/app/api/admin/subgroups/route.ts");

  it("has shared scoped admin helpers for group, subgroup, and campus bounds", () => {
    assert.match(adminLib, /scopedGroupIds/);
    assert.match(adminLib, /scopedSubgroupIds/);
    assert.match(adminLib, /scopedCampusIds/);
  });

  it("uses scoped admin authorization in structure APIs", () => {
    assert.match(campuses, /requireScopedAdmin/);
    assert.match(groups, /requireScopedAdmin/);
    assert.match(subgroups, /requireScopedAdmin/);
  });
});

describe("hosted video support", () => {
  const videoHelper = source("src/lib/video.ts");
  const coursePage = source("src/app/courses/[id]/page.tsx");
  const courseApi = source("src/app/api/lms/admin-course-actions/route.ts");
  const lessonBuilder = source("src/app/dashboard/admin/courses/[id]/lessons/page.tsx");

  it("keeps YouTube as a first-class hosted video provider", () => {
    assert.match(videoHelper, /extractYouTubeId/);
    assert.match(videoHelper, /youtubeEmbedUrl/);
    assert.match(videoHelper, /youtu\.be/);
    assert.match(videoHelper, /shorts/);
  });

  it("uses the shared hosted video helper across public and admin surfaces", () => {
    assert.match(coursePage, /parseVideoUrl/);
    assert.match(courseApi, /normalizeVideoUrl/);
    assert.match(lessonBuilder, /normalizeVideoUrl/);
    assert.match(lessonBuilder, /YouTube link/);
    assert.doesNotMatch(coursePage, /extractVimeoId|vimeoEmbedUrl/);
  });
});
