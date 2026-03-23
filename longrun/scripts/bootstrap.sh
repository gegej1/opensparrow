#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <workspace-name>"
  exit 1
fi

workspace_name="$1"
workspace_dir="longrun/workspaces/${workspace_name}"

template_dir="longrun/templates"

if [ -d "$workspace_dir" ] && [ "$(ls -A "$workspace_dir" 2>/dev/null)" ]; then
  echo "Workspace already exists and is not empty: $workspace_dir"
  exit 1
fi

mkdir -p "$workspace_dir"

cp "$template_dir/app_spec.template.md" "$workspace_dir/app_spec.md"
cp "$template_dir/feature_list.template.json" "$workspace_dir/feature_list.json"
cp "$template_dir/claude-progress.template.txt" "$workspace_dir/claude-progress.txt"
cp "$template_dir/init.template.sh" "$workspace_dir/init.sh"
chmod +x "$workspace_dir/init.sh"

cat <<MSG
Workspace created: $workspace_dir

Next steps:
1. Fill app requirements in $workspace_dir/app_spec.md
2. Expand $workspace_dir/feature_list.json to full scope
3. Run initializer session with prompt template:
   longrun/templates/initializer_prompt.template.md
4. Start tracking progress:
   python3 longrun/scripts/progress_report.py $workspace_dir/feature_list.json
5. Pick next unblocked feature candidate:
   python3 longrun/scripts/next_feature.py $workspace_dir/feature_list.json
MSG
