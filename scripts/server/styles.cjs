'use strict';

const { designTokensCss, APP_CSS } = require('./reference-styles.cjs');

const WHY_NOW_CSS = `
@font-face{font-family:Manrope;src:url('/fonts/manrope-latin-wght-normal.woff2') format('woff2');font-weight:200 800;font-display:swap}
/* WhyNow shell integration. Base app tokens, page components and final source cascade are
   preserved from Reference styles.cjs (source commit 130789f); these rules adapt its shell
   to WhyNow's workspace switcher, grouped routes and local route modules. */
.layout{grid-template-columns:252px minmax(0,1fr)}
.side{display:flex;flex-direction:column;gap:17px;min-height:0;overflow:hidden;background:var(--sidebar);color:var(--line)}
.side-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
.logo{display:flex;align-items:center;gap:10px;margin:0;color:var(--surface);font-size:15px;text-decoration:none}
.logo-mark{display:grid;flex:0 0 28px;place-items:center;width:28px;height:28px;border-radius:9px;background:var(--surface);color:var(--sidebar);font-size:10px;font-weight:800;line-height:1}
.mobile-nav-toggle{display:none}
.workspace-switcher{display:grid;gap:6px;margin:0;padding:11px;border:1px solid rgba(var(--muted-rgb),.22);border-radius:12px;background:rgba(var(--surface-rgb),.04)}
.workspace-switcher label{margin:0;color:var(--muted-on-dark);font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.workspace-switcher .workspace-control{display:flex;gap:6px;min-width:0}
.workspace-full-name,.sidebar-footer span{white-space:normal;overflow:visible;text-overflow:clip;overflow-wrap:anywhere;line-height:1.5}
.workspace-full-name{margin:0 0 5px;color:var(--surface);font-size:12px;font-weight:700}
.workspace-switcher select{flex:1;min-width:0;width:100%;min-height:34px;padding:6px 30px 6px 8px;border-color:rgba(var(--muted-rgb),.34);border-radius:8px;background:#151b23;color:var(--surface);font-size:12px}
.workspace-switcher button{flex:0 0 auto;min-height:34px;padding:6px 9px;border-color:rgba(var(--muted-rgb),.34);border-radius:8px;background:#202832;color:var(--surface);font-size:11px}
.nav{display:grid;align-content:start;gap:3px;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding-right:2px;scrollbar-width:thin;scrollbar-color:rgba(var(--muted-rgb),.5) transparent}
.nav-section{display:grid;gap:3px;margin:6px 0 5px}
.nav-section-label{grid-column:1/-1;margin:10px 8px 4px;color:#8792a2;font-size:10px;line-height:14px;font-weight:700;letter-spacing:.11em;text-transform:uppercase}
.nav a{display:flex;align-items:center;justify-content:space-between;gap:9px;min-height:36px;padding:8px 10px;border:1px solid transparent;border-radius:9px;color:#c6cdd7;font-size:13px;line-height:18px;font-weight:600;text-decoration:none}
.nav a:hover{background:rgba(var(--surface-rgb),.08);color:var(--surface)}
.nav a.active{background:rgba(var(--surface-rgb),.12);border-color:rgba(var(--surface-rgb),.09);color:var(--surface);box-shadow:inset 2px 0 0 #82aaff}
.nav-count{display:inline-grid;place-items:center;min-width:22px;height:20px;padding:1px 6px;border:1px solid rgba(var(--muted-rgb),.2);border-radius:999px;background:rgba(var(--surface-rgb),.08);color:#d6dce5;font-size:10px;line-height:16px;font-weight:700}
.sidebar-footer{display:grid;gap:4px;margin-top:auto;padding:13px 5px 2px;border-top:1px solid rgba(var(--muted-rgb),.2);color:#96a1b0;font-size:11px;line-height:16px}
.ss-page-body{min-width:0}
.ss-page{min-width:0}
/* Existing local setup/review forms use semantic controls rather than source-only classes. */
.ss-page input:not([type=hidden]):not([type=checkbox]):not([type=radio]),.ss-page textarea,.ss-page select,.overview-v2 input,.overview-v2 select{max-width:100%;min-height:38px;padding:9px 11px;border:1px solid var(--line);border-radius:9px;background:var(--surface);color:var(--ink);font:500 13px/19px var(--font)}
.ss-page textarea{width:100%;resize:vertical}
.saved-draft label:has([data-autosize-draft]){grid-column:1/-1}
.saved-draft [data-autosize-draft]{field-sizing:content;overflow-y:hidden;max-height:none;line-height:1.6}
.ss-page button,.overview-v2 button{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:38px;padding:9px 13px;border:1px solid var(--line);border-radius:9px;background:var(--surface);color:var(--ink);font:700 12px/18px var(--font);cursor:pointer}
.ss-page button.primary,.overview-v2 button.primary{background:var(--accent);border-color:var(--accent);color:var(--surface)}
.ss-page button:disabled,.overview-v2 button:disabled{cursor:not-allowed;opacity:.62}
.ss-page form>label{display:grid;gap:5px;color:var(--ink-2);font-size:12px;font-weight:700}
.ss-page label:has(input[type=checkbox]),.ss-page label:has(input[type=radio]){display:flex;align-items:flex-start;gap:8px}
.ss-page .row,.overview-v2 .row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.ss-page .row>input,.overview-v2 .row>input{flex:1;min-width:150px}
.ss-page fieldset{min-width:0;border:1px solid var(--line);border-radius:12px;padding:14px;margin:12px 0}
.ss-page legend{padding:0 5px;color:var(--ink-2);font-size:12px;font-weight:700}
.quality-warning{padding:10px 12px;border:1px solid var(--warn-border);border-radius:9px;background:var(--warn-soft);color:var(--warn);font-size:12px}
.quality-warning.advisory{border-color:var(--line);background:var(--canvas);color:var(--ink-2)}
.evidence{padding:12px 0;border-bottom:1px solid var(--line);overflow-wrap:anywhere}
.evidence.unverified{border-left:3px solid var(--warn);padding-left:12px}
.ss-page blockquote{margin:10px 0;padding:8px 12px;border-left:3px solid var(--accent-border);background:var(--canvas);color:var(--ink-2)}
.workspace-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;align-items:start}
.field{display:grid;gap:6px;min-width:0;margin:12px 0}
.field label{margin:0;color:var(--ink-2);font-size:12px;line-height:17px;font-weight:700}
.field input:not([type=checkbox]):not([type=radio]),.field select,.field textarea{width:100%;min-width:0}
.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 14px;align-items:end}
.form-grid>label{display:grid;gap:5px;margin:0;color:var(--ink-2);font-size:11px;font-weight:700}
.form-grid>label input:not([type=checkbox]):not([type=radio]),.form-grid>label select,.form-grid>label textarea{width:100%;min-width:0}
.ss-page form:not(.ss-toolbar):not(.overview-toolbar):not(.workspace-switcher):not(.inline-form):not(.outcome-compact):not(.form-grid){display:grid;gap:10px}
.ss-page form>label{margin:0}
.ss-toolbar{display:flex;align-items:end;gap:8px;flex-wrap:wrap;margin:0;padding:12px;border:1px solid var(--line);border-radius:14px;background:var(--surface);box-shadow:var(--shadow-sm)}
.ss-toolbar>label{display:grid;flex:1 1 130px;gap:5px;min-width:0;margin:0;color:var(--ink-2);font-size:10px;font-weight:700}
.ss-toolbar>label input:not([type=checkbox]):not([type=radio]),.ss-toolbar>label select{width:100%;min-width:0;min-height:36px}
.field input:not([type=checkbox]):not([type=radio]),.field select,.field textarea,.form-grid input:not([type=checkbox]):not([type=radio]),.form-grid select,.form-grid textarea,.ss-toolbar input:not([type=checkbox]):not([type=radio]),.ss-toolbar select,.ss-search-input,.ss-select{max-width:100%;min-height:38px;padding:9px 12px;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--ink);font:500 13px/19px var(--font);box-shadow:0 1px 2px rgba(var(--ink-rgb),.03)}
.field textarea,.form-grid textarea{min-height:100px;resize:vertical}
.field input:not([type=checkbox]):not([type=radio]):focus,.field select:focus,.field textarea:focus,.form-grid input:not([type=checkbox]):not([type=radio]):focus,.form-grid select:focus,.form-grid textarea:focus,.ss-toolbar input:not([type=checkbox]):not([type=radio]):focus,.ss-toolbar select:focus,.ss-search-input:focus,.ss-select:focus{border-color:var(--accent);outline:0;box-shadow:0 0 0 3px var(--accent-soft)}
.field input[type=checkbox],.field input[type=radio],.form-grid input[type=checkbox],.form-grid input[type=radio],.ss-toolbar input[type=checkbox],.ss-toolbar input[type=radio]{width:auto;min-height:auto;padding:0;accent-color:var(--accent)}
.field input:disabled,.field select:disabled,.form-grid input:disabled,.form-grid select:disabled,.ss-toolbar input:disabled,.ss-toolbar select:disabled{background:var(--neutral-soft);color:var(--ink-2);cursor:not-allowed}
.inline-form{display:inline-flex;align-items:center;gap:8px;margin:0}
.ss-btn:disabled,button:disabled,.button[aria-disabled=true]{opacity:.72;color:var(--ink-2);cursor:not-allowed}
.ss-btn.primary:disabled,button.primary:disabled{border-color:#9bb5ed;background:#9bb5ed;color:#fff;opacity:1}
.today-list{max-width:none;min-width:0}
.today-followups{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;min-width:0}
.today-followups>*{min-width:0}
.accounts-filters{display:grid;grid-template-columns:minmax(220px,1.4fr) repeat(5,minmax(130px,.7fr)) auto auto;align-items:end}
.accounts-filters>label{min-width:0}
.accounts-filters>button,.accounts-filters>a{white-space:nowrap}
.results-page .metrics-kpis{grid-template-columns:repeat(4,minmax(0,1fr))}
.lead-row{grid-template-columns:4px minmax(0,1fr) 42px;gap:11px;min-height:72px}
.score-intensity{width:4px;min-height:38px;align-self:stretch;border-radius:999px;background:var(--line)}
.score-intensity.ready,.score-intensity.score{background:var(--accent)}
.score-intensity.review{background:var(--warn)}
.score-intensity.blocked{background:var(--danger)}
.trigger-line{display:flex;align-items:center;gap:5px;min-width:0}
.trigger-icon{color:var(--accent-strong);font-size:11px;font-weight:800}
.lead-meta-line{display:flex;align-items:center;justify-content:space-between;gap:5px;min-width:0;margin-top:4px;color:var(--ink-2);font-size:10px;line-height:14px}
.lead-meta-line>span:first-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rail-status{flex:0 0 auto;padding:2px 6px;border:1px solid var(--line);border-radius:999px;background:var(--canvas);color:var(--ink-2);font-size:9px;line-height:12px;font-weight:700}
.rail-status.ready,.rail-status.approved{border-color:var(--accent-border);background:var(--accent-soft);color:var(--accent-strong)}
.rail-status.review,.rail-status.new{border-color:var(--warn-border);background:var(--warn-soft);color:var(--warn)}
.rail-status.blocked,.rail-status.killed{border-color:var(--danger-border);background:var(--danger-soft);color:var(--danger)}
.score-box strong{display:block;font-size:48px;line-height:1;font-weight:800}
.scorecard-page .ss-table td>a.ss-source-link{display:block;min-height:36px}
.brief-body>.brief-main{min-width:0;max-width:none;width:auto;margin:0;padding:0;overflow:visible}
.brief-body>aside{min-width:0}
.overview-toolbar>label{display:grid;gap:5px;color:var(--ink-2);font-size:10px;font-weight:700}
.overview-toolbar>label>span{color:var(--ink-2);font-size:10px;line-height:13px;font-weight:700;text-transform:uppercase;letter-spacing:.08em}
.overview-toolbar .overview-search>span{position:static;transform:none}
.overview-toolbar .overview-search>input{padding-left:12px}
.overview-toolbar .button{min-height:36px}
@media(max-width:1280px){main{padding:22px 24px 38px}}
@media(max-width:960px){.layout{grid-template-columns:1fr}.side{position:sticky;z-index:20;top:0;width:100%;height:auto;min-height:0;overflow:visible;padding:12px 16px}.side-head{min-height:32px}.mobile-nav-toggle{display:inline-flex;min-height:32px;padding:6px 10px;border-color:rgba(var(--muted-rgb),.34);background:#202832;color:var(--surface);font-size:11px}.workspace-switcher{grid-template-columns:auto minmax(180px,1fr);align-items:center;padding:8px 10px}.workspace-switcher label{white-space:nowrap}.workspace-switcher .workspace-control{max-width:420px}.nav{display:none;max-height:min(65vh,520px);margin-top:4px;padding-bottom:2px}.side.is-open .nav{display:grid}.nav-section{grid-template-columns:repeat(2,minmax(0,1fr));gap:2px 6px;margin:2px 0}.nav-section-label{margin:9px 8px 3px}.sidebar-footer{display:none}main{padding:20px 18px 36px}.results-layout{grid-template-columns:1fr}.lead-rail{position:relative;top:auto;max-height:none}.brief-body{grid-template-columns:1fr}.workspace-grid,.form-grid{grid-template-columns:1fr}.results-page .metrics-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:1340px){.accounts-filters{grid-template-columns:repeat(3,minmax(140px,1fr))}.accounts-filters .accounts-search{grid-column:1/-1}}
@media(max-width:960px){.today-followups{grid-template-columns:1fr}}
@media(max-width:620px){.side{padding:10px 12px}.workspace-switcher{grid-template-columns:1fr;gap:5px}.workspace-switcher .workspace-control{max-width:none}.nav-section{grid-template-columns:1fr 1fr}.nav a{min-height:34px;padding:7px 8px;font-size:12px}.nav-count{min-width:20px;height:18px;font-size:9px}main{padding:17px 12px 28px}.ss-header,.top,.kanban-heading{align-items:flex-start;flex-direction:column}.ss-actions{width:100%}.overview-toolbar{display:grid;grid-template-columns:1fr 1fr;align-items:end}.overview-toolbar .overview-search{grid-column:1/-1;max-width:none}.overview-toolbar .button{width:100%}.results-page .metrics-kpis{grid-template-columns:1fr}.accounts-filters{grid-template-columns:repeat(2,minmax(0,1fr))}.accounts-filters .accounts-search{grid-column:1/-1}.accounts-filters>button,.accounts-filters>a{width:100%}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;transition-duration:.01ms!important;animation-duration:1ms!important;animation-iteration-count:1!important}}
/* The source hides its checkbox column on phones; WhyNow's first column is account identity. */
@media(max-width:760px){.ss-page .ss-table td:first-child{display:block}}
`;

module.exports = `${designTokensCss()}${APP_CSS}${WHY_NOW_CSS}`;
