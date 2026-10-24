<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Tool catalog lives in src/lib/tools.ts; each category renders at /tools/$category (single data source keeps nav and pages in sync).
- Company lookup uses public read-only server functions for official registries, processes bounded batches, and keeps imported lists and results in page state to avoid storing user files unnecessarily.
- Postal enrichment must match county, locality, street and number ranges against official candidates; unresolved or ambiguous addresses remain flagged rather than guessed.
- Spreadsheet parsing and exports load SheetJS only in browser event handlers; exported registry strings are sanitized to prevent formula injection.
