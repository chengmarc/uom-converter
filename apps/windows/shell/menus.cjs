// The native menus' text. Electron gives its menu roles English labels on Windows, so each role here
// gets its label from the page's language. By @uom/i18n language id; @uom/test's windows/menus.test.ts checks them all.

const TEXT = {
  en: { edit: "Edit", view: "View", undo: "Undo", redo: "Redo", cut: "Cut", copy: "Copy", paste: "Paste", selectAll: "Select All", reload: "Reload", resetZoom: "Actual Size", zoomIn: "Zoom In", zoomOut: "Zoom Out", fullscreen: "Toggle Full Screen" },
  zh: { edit: "编辑", view: "视图", undo: "撤销", redo: "重做", cut: "剪切", copy: "复制", paste: "粘贴", selectAll: "全选", reload: "重新加载", resetZoom: "实际大小", zoomIn: "放大", zoomOut: "缩小", fullscreen: "切换全屏" },
  ja: { edit: "編集", view: "表示", undo: "元に戻す", redo: "やり直し", cut: "切り取り", copy: "コピー", paste: "貼り付け", selectAll: "すべて選択", reload: "再読み込み", resetZoom: "実際のサイズ", zoomIn: "拡大", zoomOut: "縮小", fullscreen: "全画面表示の切り替え" },
  es: { edit: "Edición", view: "Ver", undo: "Deshacer", redo: "Rehacer", cut: "Cortar", copy: "Copiar", paste: "Pegar", selectAll: "Seleccionar todo", reload: "Recargar", resetZoom: "Tamaño real", zoomIn: "Acercar", zoomOut: "Alejar", fullscreen: "Pantalla completa" },
  de: { edit: "Bearbeiten", view: "Ansicht", undo: "Rückgängig", redo: "Wiederholen", cut: "Ausschneiden", copy: "Kopieren", paste: "Einfügen", selectAll: "Alles auswählen", reload: "Neu laden", resetZoom: "Originalgröße", zoomIn: "Vergrößern", zoomOut: "Verkleinern", fullscreen: "Vollbild umschalten" },
  fr: { edit: "Édition", view: "Affichage", undo: "Annuler", redo: "Rétablir", cut: "Couper", copy: "Copier", paste: "Coller", selectAll: "Tout sélectionner", reload: "Recharger", resetZoom: "Taille réelle", zoomIn: "Zoom avant", zoomOut: "Zoom arrière", fullscreen: "Plein écran" },
};

/** The application menu, hidden until Alt: it keeps copy, paste, zoom and reload shortcuts. */
function appMenu(language) {
  const m = TEXT[language] ?? TEXT.en;
  return [
    {
      label: m.edit,
      submenu: [
        { role: "undo", label: m.undo },
        { role: "redo", label: m.redo },
        { type: "separator" },
        { role: "cut", label: m.cut },
        { role: "copy", label: m.copy },
        { role: "paste", label: m.paste },
        { type: "separator" },
        { role: "selectAll", label: m.selectAll },
      ],
    },
    {
      label: m.view,
      submenu: [
        { role: "reload", label: m.reload },
        { role: "resetZoom", label: m.resetZoom },
        { role: "zoomIn", label: m.zoomIn },
        { role: "zoomOut", label: m.zoomOut },
        { type: "separator" },
        { role: "togglefullscreen", label: m.fullscreen },
      ],
    },
  ];
}

/** Right-click: the usual edit menu in text boxes, Copy on selected text. */
function contextMenu(language, p) {
  const m = TEXT[language] ?? TEXT.en;
  const f = p.editFlags;
  if (p.isEditable) {
    return [
      { role: "undo", label: m.undo, enabled: f.canUndo },
      { role: "redo", label: m.redo, enabled: f.canRedo },
      { type: "separator" },
      { role: "cut", label: m.cut, enabled: f.canCut },
      { role: "copy", label: m.copy, enabled: f.canCopy },
      { role: "paste", label: m.paste, enabled: f.canPaste },
      { type: "separator" },
      { role: "selectAll", label: m.selectAll, enabled: f.canSelectAll },
    ];
  }
  return p.selectionText.trim() ? [{ role: "copy", label: m.copy }] : [];
}

module.exports = { TEXT, appMenu, contextMenu };
