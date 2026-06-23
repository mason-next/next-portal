// Sentinel stored in a role id field (e.g. Project.solutionsEngineerId) to mean "this
// role doesn't apply to this project" — distinct from null ("not yet assigned"). Lets
// Assign Team complete without every role needing a real person.
export const ROLE_NOT_NEEDED = "not-needed";
