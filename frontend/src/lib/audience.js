export const AUDIENCE_LABELS = {
  public: "Public",
  student: "Student",
  staff: "Staff",
};

const AUDIENCE_STYLES = {
  public: { bg: "bg-jkuat-green/10", text: "text-jkuat-green" },
  staff: { bg: "bg-blue-50", text: "text-blue-700" },
  student: { bg: "bg-amber-50", text: "text-amber-700" },
};

export function audienceStyle(audience) {
  return AUDIENCE_STYLES[audience] || AUDIENCE_STYLES.public;
}