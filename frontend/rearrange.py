import re

with open('src/pages/HabitDetail/HabitDetailPage.tsx', 'r') as f:
    content = f.read()

# The blocks we want to extract and rearrange:
# 1. HeaderRow + ChipsRow (Lines 370 to 430) -> goes into bannerCard
# 2. AboutCard (Lines 433 to 460) -> goes into sideColumn
# 3. GoalCard (Lines 463 to 524) -> goes into mainColumn
# 4. StatsCard (Lines 527 to 564) -> goes into mainColumn

header_regex = re.compile(r'(        \{\/\* ── Header Row.*?\n        </div>\n)', re.DOTALL)
chips_regex = re.compile(r'(        \{\/\* ── Chips.*?\n        </div>\n)', re.DOTALL)
about_regex = re.compile(r'(        \{\/\* ── About Card.*?\n        </div>\n)', re.DOTALL)
goal_regex = re.compile(r'(        \{\/\* ── Goal progress card.*?\n        </div>\n)', re.DOTALL)
stats_regex = re.compile(r'(        \{\/\* ── Statistics card.*?\n          </div>\n        </div>\n)', re.DOTALL)

header = header_regex.search(content).group(1)
chips = chips_regex.search(content).group(1)
about = about_regex.search(content).group(1)
goal = goal_regex.search(content).group(1)
stats = stats_regex.search(content).group(1)

# Now, we find the entire block from Header to Stats to replace it
start_idx = content.find('        {/* ── Header Row')
end_idx = content.find('      </div>\n\n      {showEdit && editMode')

new_block = f"""        <div className={{styles.bannerCard}}>
{header}
{chips}
        </div>

        <div className={{styles.mainGrid}}>
          <div className={{styles.mainColumn}}>
{goal}
{stats}
          </div>
          <div className={{styles.sideColumn}}>
{about}
          </div>
        </div>
"""

new_content = content[:start_idx] + new_block + content[end_idx:]

with open('src/pages/HabitDetail/HabitDetailPage.tsx', 'w') as f:
    f.write(new_content)
