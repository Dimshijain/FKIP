import re

def format_sql_query(sql_text: str, dialect: str = "ORACLE") -> str:
    """Format and beautify SQL keywords, clause indentation, and line breaks cleanly."""
    if not sql_text or not sql_text.strip():
        return ""

    raw = sql_text.strip()
    
    # 1. Standardize uppercase for key SQL keywords
    keywords = [
        "SELECT", "DISTINCT", "FROM", "WHERE", "GROUP BY", "HAVING", "ORDER BY",
        "LEFT JOIN", "RIGHT JOIN", "FULL OUTER JOIN", "INNER JOIN", "CROSS JOIN", "JOIN",
        "ON", "AND", "OR", "LIMIT", "OFFSET", "FETCH FIRST", "ROWS ONLY", "WITH",
        "UNION ALL", "UNION", "AS", "CASE", "WHEN", "THEN", "ELSE", "END",
        "BETWEEN", "IN", "EXISTS", "NOT IN", "NOT EXISTS", "NOT",
        "IS NULL", "IS NOT NULL", "LIKE", "ILIKE", "DESC", "ASC",
        "COUNT", "SUM", "AVG", "MIN", "MAX", "COALESCE", "NVL", "TO_DATE", "TO_CHAR",
        "CURRENT_TIMESTAMP", "CURRENT_DATE", "SYSDATE", "ROWNUM"
    ]
    
    keywords_sorted = sorted(keywords, key=len, reverse=True)
    formatted = raw
    for kw in keywords_sorted:
        pattern = re.compile(r'\b' + re.escape(kw) + r'\b', re.IGNORECASE)
        formatted = pattern.sub(kw, formatted)

    # 2. Break major clauses onto dedicated new lines
    major_clauses = ["WITH", "SELECT", "FROM", "WHERE", "GROUP BY", "HAVING", "ORDER BY", "FETCH FIRST", "LIMIT"]
    for clause in major_clauses:
        pattern = re.compile(r'\s*\b(' + clause + r')\b\s*', re.IGNORECASE)
        formatted = pattern.sub(r'\n\1 ', formatted)

    # Joins in a single unified regex matching multi-word first
    formatted = re.sub(
        r'\s*\b(LEFT\s+JOIN|RIGHT\s+JOIN|FULL\s+OUTER\s+JOIN|INNER\s+JOIN|CROSS\s+JOIN|JOIN)\b\s*',
        lambda m: f"\n  {re.sub(r'\s+', ' ', m.group(1).upper())} ",
        formatted,
        flags=re.IGNORECASE
    )

    # AND / OR conditions under WHERE
    formatted = re.sub(r'\s*\b(AND|OR)\b\s*', r'\n  \1 ', formatted)

    lines = [line.rstrip() for line in formatted.split('\n') if line.strip()]
    final_lines = []
    in_select = False
    
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        first_token = stripped.split()[0].upper()
        if first_token in ["SELECT", "WITH"]:
            in_select = True
            cols_part = stripped[len(first_token):].strip()
            final_lines.append(first_token)
            if cols_part:
                col_tokens = re.split(r',\s*(?![^()]*\))', cols_part)
                for idx, col in enumerate(col_tokens):
                    clean_col = col.strip().rstrip(',')
                    if clean_col:
                        suffix = "," if idx < len(col_tokens) - 1 else ""
                        final_lines.append(f"  {clean_col}{suffix}")
        elif first_token in ["FROM", "WHERE", "GROUP", "ORDER", "HAVING", "LIMIT", "FETCH"]:
            in_select = False
            final_lines.append(stripped)
        elif stripped.startswith(("LEFT JOIN", "RIGHT JOIN", "FULL OUTER JOIN", "INNER JOIN", "CROSS JOIN", "JOIN")):
            in_select = False
            final_lines.append(f"  {stripped}")
        elif stripped.startswith(("AND ", "OR ")):
            final_lines.append(f"  {stripped}")
        else:
            if in_select and not stripped.startswith("  "):
                final_lines.append(f"  {stripped}")
            else:
                final_lines.append(stripped)
                
    result = "\n".join(final_lines)
    if not result.endswith(';') and raw.endswith(';'):
        result += ';'
    return result

if __name__ == "__main__":
    q1 = "select d.department_name, count(e.id) as employee_count, avg(e.salary) as avg_salary from departments d left join employees e on e.department_id = d.department_id where e.salary > 50000 and d.location = 'London' group by d.department_name order by avg_salary desc fetch first 10 rows only;"
    print("--- FORMATTED QUERY 1 (Oracle) ---")
    formatted1 = format_sql_query(q1, "ORACLE")
    print(formatted1)
    
    q2 = "select u.id, u.email, u.role from users u where u.role = 'admin' and u.created_at is not null order by u.created_at desc limit 10;"
    print("\n--- FORMATTED QUERY 2 (PostgreSQL) ---")
    formatted2 = format_sql_query(q2, "POSTGRESQL")
    print(formatted2)

    print("\n--- IDEMPOTENCY TEST (Re-formatting already formatted SQL) ---")
    reformatted1 = format_sql_query(formatted1, "ORACLE")
    assert reformatted1.strip() == formatted1.strip(), "Formatting should be idempotent!"
    print("PASS: Re-formatting yields identical result.")
