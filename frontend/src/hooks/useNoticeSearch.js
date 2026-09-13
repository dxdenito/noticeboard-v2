import { useMemo } from "react";
import { matchNotice } from "../utils/NoticeSearch";


export function useNoticeSearch(notices, query) {
  return useMemo(
    () => notices.filter((notice) => matchNotice(notice, query)),
    [notices, query]
  );
}