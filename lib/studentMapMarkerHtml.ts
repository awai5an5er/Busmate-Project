/** Blue location marker for the student on the live map. */
export function studentMapMarkerHtml(): string {
  return `
<div style="width:36px;height:36px;transform:translate(-50%,-50%);filter:drop-shadow(0 2px 6px rgba(37,99,235,.45));">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="36" height="36" aria-hidden="true">
    <circle cx="18" cy="18" r="16" fill="#3b82f6" stroke="#1d4ed8" stroke-width="2"/>
    <circle cx="18" cy="18" r="6" fill="#ffffff"/>
  </svg>
</div>`;
}
