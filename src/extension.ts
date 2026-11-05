import * as vscode from 'vscode';
import { execFile, spawn, ChildProcess } from 'child_process';
import { isCompile } from './match';

const CLIP_MS = 2900; // length of media/dog.gif and dog.wav

let lastShow = 0;
let player: ChildProcess | undefined;

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push({ dispose: () => player?.kill() });
  const cfg = () => vscode.workspace.getConfiguration('dogOnCompile');
  const matches = (text: string) => isCompile(text, cfg().get('pattern', 'build|compile'));

  context.subscriptions.push(
    vscode.commands.registerCommand('dogOnCompile.show', () => celebrate(context)),

    // Tasks (Ctrl+Shift+B, tasks.json): any successful build-group task or task whose name matches.
    vscode.tasks.onDidEndTaskProcess(e => {
      const t = e.execution.task;
      if (e.exitCode === 0 && (t.group?.id === vscode.TaskGroup.Build.id || matches(t.name))) celebrate(context);
    }),

    // Integrated terminal commands (needs shell integration, on by default).
    vscode.window.onDidEndTerminalShellExecution(e => {
      if (e.exitCode === 0 && matches(e.execution.commandLine.value)) celebrate(context);
    }),
  );
}

function celebrate(context: vscode.ExtensionContext) {
  // A build task also runs in a terminal, so both events can fire for one build.
  if (Date.now() - lastShow < 1500) return;
  if (!vscode.window.activeTextEditor && !vscode.window.visibleTextEditors.length) return void showDog(context);
  lastShow = Date.now();
  if (vscode.workspace.getConfiguration('dogOnCompile').get('sound', true)) playSound(context);
  showDog(context);
}

// Overlay the GIF at the top-center of the visible editor area via a decoration (same trick as "Cat clapping").
function showDog(context: vscode.ExtensionContext): boolean {
  const editor = vscode.window.activeTextEditor ?? vscode.window.visibleTextEditors[0];
  if (!editor) {
    vscode.window.showInformationMessage('🐶 Build succeeded! (open a file to see the dog)');
    return false;
  }
  const deco = vscode.window.createTextEditorDecorationType({
    before: {
      contentIconPath: vscode.Uri.joinPath(context.extensionUri, 'media', 'dog.gif').with({ query: String(Date.now()) }),
      // ponytail: CSS injected through textDecoration is an undocumented hack; replace if VS Code ever sanitizes it.
      textDecoration: 'none; position: absolute; top: 8px; left: 50%; transform: translateX(-50%); pointer-events: none; z-index: 10;',
      width: '134px',
      height: '180px',
    },
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
  });
  const place = () => {
    const pos = new vscode.Position(editor.visibleRanges[0]?.start.line ?? 0, 0);
    editor.setDecorations(deco, [new vscode.Range(pos, pos)]);
  };
  place();
  const scroll = vscode.window.onDidChangeTextEditorVisibleRanges(e => e.textEditor === editor && place());
  const ms = Math.max(CLIP_MS, vscode.workspace.getConfiguration('dogOnCompile').get('durationSeconds', 3) * 1000);
  setTimeout(() => { scroll.dispose(); deco.dispose(); }, ms);
  return true;
}

function playSound(context: vscode.ExtensionContext) {
  const wav = vscode.Uri.joinPath(context.extensionUri, 'media', 'dog.wav').fsPath;
  const fail = (e: Error | null) => e && console.error('[Dog on Compile] audio:', e.message);
  if (process.platform === 'win32') {
    if (!player || player.exitCode !== null) {
      const p = wav.replace(/'/g, "''");
      const script = `$s = New-Object System.Media.SoundPlayer '${p}'; $s.Load(); while ($null -ne [Console]::In.ReadLine()) { $s.Stop(); $s.Play() }`;
      player = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { windowsHide: true, stdio: ['pipe', 'ignore', 'pipe'] });
      player.stderr?.on('data', d => console.error('[Dog on Compile] audio:', String(d)));
      player.on('error', fail);
    }
    player.stdin?.write('play\n');
  } else if (process.platform === 'darwin') {
    execFile('afplay', [wav], fail);
  } else {
    execFile('paplay', [wav], e => e && execFile('aplay', [wav], fail));
  }
}

export function deactivate() {}
