import curses
from .config import MEM_HOME, EDITOR

def search_files(terms):
    """Return list of (Path, title, lines, line_num) sorted by relevance & recency."""
    terms = [t.lower() for t in terms if t.strip()]
    results = []
    for f in MEM_HOME.glob("*.md"):
        try:
            stat = f.stat()
            mtime = stat.st_mtime
            text = f.read_text(errors="ignore")
            if not text.strip():
                continue
            text_lower = text.lower()
            name_lower = f.stem.lower()
            match_filename = not terms or all(t in name_lower for t in terms)
            match_content = bool(terms) and not match_filename and all(t in text_lower for t in terms)
            if not terms or match_filename or match_content:
                lines = text.splitlines()
                # Title
                title = ""
                if lines:
                    first = lines[0]
                    if first.startswith("# "):
                        title = first[2:].strip()
                    elif first.startswith("#"):
                        title = first[1:].strip()
                    else:
                        title = first.strip()
                if not title:
                    title = f.stem.replace("_", " ").title()
                # line_num for match
                line_num = None
                if terms and match_content:
                    positions = [text_lower.find(t) for t in terms]
                    pos_list = [p for p in positions if p >= 0]
                    if pos_list:
                        min_pos = min(pos_list)
                        line_num = text_lower[:min_pos].count("\n")
                score = 2 if match_filename else 1 if match_content else 0
                results.append((f, title, lines, line_num, score, mtime))
        except Exception:
            continue
    # Sort: relevance first, then recency
    results.sort(key=lambda x: (-x[4], -x[5]))
    return [(f, title, lines, line_num) for f, title, lines, line_num, _, _ in results[:50]]

def run_ui(_args):
    def main(stdscr):
        # Curses setup
        curses.curs_set(1)
        stdscr.nodelay(False)
        highlight_color = 0
        select_color = 0
        title_color = 0
        preview_color = 0
        status_color = 0
        if curses.has_colors():
            curses.start_color()
            curses.use_default_colors()
            try:
                # High contrast pairs
                curses.init_pair(1, curses.COLOR_WHITE, curses.COLOR_BLACK) # Query: white on black
                curses.init_pair(2, curses.COLOR_BLACK, curses.COLOR_WHITE) # Select: black on white (high contrast)
                curses.init_pair(3, curses.COLOR_YELLOW, curses.COLOR_BLACK) # Title: yellow on black
                curses.init_pair(4, curses.COLOR_WHITE, curses.COLOR_BLACK) # Preview: white on black (bold for contrast)
                curses.init_pair(5, curses.COLOR_BLACK, curses.COLOR_MAGENTA) # Status: black on magenta
                highlight_color = curses.color_pair(1) | curses.A_BOLD
                select_color = curses.color_pair(2) | curses.A_BOLD
                title_color = curses.color_pair(3) | curses.A_BOLD
                preview_color = curses.color_pair(4)
                status_color = curses.color_pair(5) | curses.A_BOLD
            except curses.error:
                # Fallback to attributes only
                pass
        # State
        query = ""
        results = search_files([])
        pos = 0
        scroll_pos = 0
        expanded = set()
        def ensure_pos_visible():
            nonlocal scroll_pos
            h, _ = stdscr.getmaxyx()
            available = h - 3
            if pos < scroll_pos:
                scroll_pos = pos
                return
            # Compute entry_heights
            entry_heights = []
            for i in range(len(results)):
                _, _, lines, line_num = results[i]
                is_exp = i in expanded
                eh = 1  # title
                if is_exp:
                    eh += len(lines)
                else:
                    eh += min(4, len(lines))
                if not is_exp and len(lines) > 4:
                    eh += 1  # ...
                eh += 1  # spacer
                entry_heights.append(eh)
            # Start with pos
            cum = entry_heights[pos]
            current_start = pos
            while current_start > 0 and cum + entry_heights[current_start - 1] <= available:
                cum += entry_heights[current_start - 1]
                current_start -= 1
            scroll_pos = current_start
        def draw():
            stdscr.erase()
            h, w = stdscr.getmaxyx()
            # Prompt (high contrast, bold)
            prompt = f"Search: {query} "
            if len(prompt) > w:
                prompt = f"Search: …{query[-(w - 10):]} "
            stdscr.addstr(0, 0, prompt[:w], highlight_color)
            # Separator (thicker visual, bold)
            stdscr.addstr(1, 0, "═" * w, curses.A_BOLD)
            # Results
            current_y = 2
            if not results:
                msg = "No matches. Type to search filenames/content." if query else "Showing recent notes."
                stdscr.addstr(current_y, 1, msg[:w-1], curses.A_BOLD | curses.A_STANDOUT) # High contrast for empty state
                current_y += 1
            else:
                for idx in range(scroll_pos, len(results)):
                    if current_y >= h - 1:
                        break
                    is_sel = (idx == pos)
                    is_exp = idx in expanded
                    f, title, lines, line_num = results[idx]
                    marker = "▶" if is_sel else "○" # Subtle icons for scanability
                    # Line 1: High contrast title/filename combo
                    line1 = f"{marker} {f.name} {title}"
                    if len(line1) > w:
                        line1 = line1[:w]
                    attr1 = select_color if is_sel else title_color
                    stdscr.addstr(current_y, 0, line1, attr1)
                    current_y += 1
                    if current_y >= h - 1:
                        break
                    # Content lines
                    has_more = False
                    if is_exp:
                        display_lines = lines
                    else:
                        start = line_num if line_num is not None else 0
                        display_lines = lines[start: start + 4]
                        has_more = start + 4 < len(lines)
                    for p in display_lines:
                        p_display = f"  {p.rstrip()}"
                        if len(p_display) > w:
                            p_display = p_display[:w]
                        attr_p = select_color if is_sel else preview_color | curses.A_BOLD
                        stdscr.addstr(current_y, 0, p_display, attr_p)
                        current_y += 1
                        if current_y >= h - 1:
                            break
                    if current_y >= h - 1:
                        break
                    if has_more:
                        more_text = "  ... (right arrow to extend)"
                        stdscr.addstr(current_y, 0, more_text[:w], attr_p)
                        current_y += 1
                        if current_y >= h - 1:
                            break
                    # Spacer line (dim but visible)
                    stdscr.addstr(current_y, 0, "─" * w, curses.A_BOLD)
                    current_y += 1
            # Status (high contrast reverse + color)
            curr = pos + 1
            total = len(results)
            label = "matches" if query.strip() else "notes"
            status = f" {total} {label} | {curr}/{total} | ↑↓/PgUpDn: move ←→: +/- expand Enter: edit q: quit"
            stdscr.addstr(h - 1, 0, status[:w], status_color | curses.A_REVERSE)
            # Cursor
            cursor_x = len("Search: ") + len(query)
            stdscr.move(0, min(cursor_x, w - 1))
            stdscr.refresh()
        while True:
            ensure_pos_visible()
            draw()
            ch = stdscr.getch()
            query_changed = False
            if ch in (curses.KEY_BACKSPACE, 127, 8):
                if query:
                    query = query[:-1]
                    query_changed = True
            elif 32 <= ch <= 126:
                query += chr(ch)
                query_changed = True
            elif ch in (10, 13, curses.KEY_ENTER):
                if results and 0 <= pos < len(results):
                    selected = results[pos][0]
                    curses.endwin()
                    subprocess.call([EDITOR, str(selected)])
                    return
            elif ch in (27, ord('q'), ord('Q')):
                return
            elif ch == curses.KEY_UP and pos > 0:
                pos -= 1
            elif ch == curses.KEY_DOWN and results and pos < len(results) - 1:
                pos += 1
            elif ch == curses.KEY_RIGHT:
                expanded.add(pos)
            elif ch == curses.KEY_LEFT:
                expanded.discard(pos)
            elif ch == curses.KEY_PPAGE:
                pos = max(0, pos - 5)
            elif ch == curses.KEY_NPAGE:
                pos = min(len(results) - 1, pos + 5)
            elif ch == curses.KEY_HOME:
                pos = 0
            elif ch == curses.KEY_END:
                pos = len(results) - 1 if results else 0
            elif ch == curses.KEY_RESIZE:
                pass
            else:
                continue  # Ignore other keys
            if query_changed:
                terms = query.strip().split()
                results = search_files(terms)
                pos = 0
                scroll_pos = 0
                expanded.clear()
    curses.wrapper(main)