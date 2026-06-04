import json
import ast

transcript_path = 'C:/Users/leonc/.gemini/antigravity-ide/brain/0d7f962a-55a6-4e0a-b68c-fb2d80527253/.system_generated/logs/transcript.jsonl'
output_path = 'scratch/restored_css_edits.txt'

out = open(output_path, 'w', encoding='utf-8')

with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            step = json.loads(line)
        except Exception as e:
            continue
        if step.get('status') == 'DONE' and 'tool_calls' in step:
            for tc in step['tool_calls']:
                args = tc.get('args')
                if not isinstance(args, dict):
                    continue
                target_file = args.get('TargetFile', '')
                if not isinstance(target_file, str):
                    continue
                # Clean quotes from JSON representation
                target_file = target_file.strip('"\'')
                if '06-modern-refresh.css' in target_file or 'SecretariaRegistroModal.jsx' in target_file:
                    step_idx = step.get('step_index')
                    tool_name = tc.get('name')
                    out.write(f'=== STEP {step_idx} ({tool_name}) for {target_file} ===\n')
                    if tool_name == 'multi_replace_file_content':
                        chunks = args.get('ReplacementChunks', [])
                        if isinstance(chunks, str):
                            try:
                                chunks = json.loads(chunks)
                            except:
                                try:
                                    chunks = ast.literal_eval(chunks)
                                except:
                                    chunks = []
                        if isinstance(chunks, list):
                            for chunk in chunks:
                                if isinstance(chunk, dict):
                                    start_line = chunk.get('StartLine')
                                    end_line = chunk.get('EndLine')
                                    target_content = chunk.get('TargetContent', '')
                                    replacement_content = chunk.get('ReplacementContent', '')
                                    out.write(f'--- CHUNK (StartLine: {start_line}, EndLine: {end_line}) ---\n')
                                    out.write('Target:\n' + str(target_content) + '\n')
                                    out.write('Replacement:\n' + str(replacement_content) + '\n')
                    elif tool_name == 'replace_file_content':
                        start_line = args.get('StartLine')
                        end_line = args.get('EndLine')
                        target_content = args.get('TargetContent', '')
                        replacement_content = args.get('ReplacementContent', '')
                        out.write(f'StartLine: {start_line}, EndLine: {end_line}\n')
                        out.write('Target:\n' + str(target_content) + '\n')
                        out.write('Replacement:\n' + str(replacement_content) + '\n')
                    out.write('='*80 + '\n\n')
out.close()
print('Done!')
