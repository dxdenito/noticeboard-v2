export function matchNotice(notice, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const fields = [
    notice.title,
    notice.body, // may be null/masked for unverified audience — skip gracefully
    notice.category?.name,
    notice.department?.name,
    notice.club?.name,
    notice.course?.name,
  ];

  return fields.some(
    (field) => typeof field === "string" && field.toLowerCase().includes(q)
  );
}