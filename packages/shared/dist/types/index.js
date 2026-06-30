export var UserRole;
(function (UserRole) {
    UserRole["BACKER"] = "BACKER";
    UserRole["ORG_OWNER"] = "ORG_OWNER";
    UserRole["SUPER_ADMIN"] = "SUPER_ADMIN";
})(UserRole || (UserRole = {}));
export var ProjectStatus;
(function (ProjectStatus) {
    ProjectStatus["DRAFT"] = "DRAFT";
    ProjectStatus["LIVE"] = "LIVE";
    ProjectStatus["COMPLETED"] = "COMPLETED";
    ProjectStatus["PAUSED"] = "PAUSED";
    ProjectStatus["CANCELLED"] = "CANCELLED";
})(ProjectStatus || (ProjectStatus = {}));
export var MilestoneStatus;
(function (MilestoneStatus) {
    MilestoneStatus["PENDING"] = "PENDING";
    MilestoneStatus["AUTO_RELEASED"] = "AUTO_RELEASED";
    MilestoneStatus["VOTING"] = "VOTING";
    MilestoneStatus["PASSED"] = "PASSED";
    MilestoneStatus["FAILED"] = "FAILED";
    MilestoneStatus["CLAIMED"] = "CLAIMED";
})(MilestoneStatus || (MilestoneStatus = {}));
export var RewardCurve;
(function (RewardCurve) {
    RewardCurve["LINEAR"] = "LINEAR";
    RewardCurve["EXPONENTIAL"] = "EXPONENTIAL";
    RewardCurve["BINARY"] = "BINARY";
    RewardCurve["CUSTOM"] = "CUSTOM";
})(RewardCurve || (RewardCurve = {}));
export var VoteChoice;
(function (VoteChoice) {
    VoteChoice["YES"] = "YES";
    VoteChoice["NO"] = "NO";
})(VoteChoice || (VoteChoice = {}));
export var VerificationStatus;
(function (VerificationStatus) {
    VerificationStatus["PENDING"] = "PENDING";
    VerificationStatus["VERIFIED"] = "VERIFIED";
    VerificationStatus["REJECTED"] = "REJECTED";
})(VerificationStatus || (VerificationStatus = {}));
//# sourceMappingURL=index.js.map