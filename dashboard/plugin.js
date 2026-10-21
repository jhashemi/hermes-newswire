/*
 * Hermes Newswire — web-dashboard entry (dashboard/plugin.js).
 *
 * The desktop app loads `desktop/plugin.js` (ESM, @hermes/plugin-sdk).
 * The web dashboard loads THIS file via <script src="/dashboard-plugins/
 * hermes-newswire/plugin.js"> (manifest "entry"). The dashboard host has no
 * module loader for bare specifiers, so this file is a classic script (IIFE)
 * that reads the SDK off window — same pattern as the bundled
 * hermes-achievements dashboard plugin.
 *
 * It renders a read-only status panel over the plugin's Python backend
 * (/api/plugins/hermes-newswire/*). All feed I/O stays server-side.
 */
(function () {
  "use strict";

  var SDK = window.__HERMES_PLUGIN_SDK__;
  var REG = window.__HERMES_PLUGINS__;
  if (!SDK || !REG) return;

  var React = SDK.React;
  var hooks = SDK.hooks;
  var fetchJSON = SDK.fetchJSON;
  var cn = SDK.utils && SDK.utils.cn;

  var PLUGIN = "hermes-newswire";
  var BASE = "/api/plugins/" + PLUGIN;

  function Card(props) {
    return React.createElement(
      "div",
      {
        className: cn(
          "rounded-lg border border-current/15 p-4",
          props.className || ""
        ),
      },
      props.children
    );
  }

  function Row(props) {
    return React.createElement(
      "div",
      { className: "flex items-center justify-between py-1 text-sm" },
      React.createElement(
        "span",
        { className: "text-text-secondary" },
        props.label
      ),
      React.createElement(
        "span",
        { className: "font-mono text-text-primary" },
        props.value
      )
    );
  }

  function Status() {
    var useState = hooks.useState;
    var useEffect = hooks.useEffect;
    var st = useState({ loading: true, error: null, state: null, sources: [] });
    var state = st[0];
    var setState = st[1];

    useEffect(
      function () {
        var alive = true;
        Promise.all([
          fetchJSON(BASE + "/state"),
          fetchJSON(BASE + "/sources"),
        ])
          .then(function (rs) {
            if (alive)
              setState({
                loading: false,
                error: null,
                state: rs[0],
                sources: (rs[1] && rs[1].sources) || [],
              });
          })
          .catch(function (e) {
            if (alive)
              setState({
                loading: false,
                error: String((e && e.message) || e),
                state: null,
                sources: [],
              });
          });
        return function () {
          alive = false;
        };
      },
      []
    );

    if (state.loading)
      return React.createElement(
        "div",
        { className: "p-4 text-sm text-text-tertiary" },
        "Loading newswire state…"
      );

    if (state.error)
      return React.createElement(
        "div",
        { className: "max-w-lg p-4 text-sm text-text-secondary", role: "alert" },
        "Newswire backend unreachable (",
        state.error,
        "). The ticker itself runs in the Hermes Desktop app."
      );

    var counts = (state.state && state.state.counts) || {};
    var settings = (state.state && state.state.settings) || {};

    return React.createElement(
      "div",
      { className: "flex max-w-2xl flex-col gap-4 p-4" },
      React.createElement(
        "h2",
        {
          className:
            "font-mondwest text-display text-sm tracking-[0.12em] text-text-primary",
        },
        "Hermes Newswire"
      ),
      React.createElement(
        Card,
        null,
        React.createElement(Row, { label: "Sources", value: counts.sources }),
        React.createElement(Row, {
          label: "Enabled sources",
          value: counts.enabled_sources,
        }),
        React.createElement(Row, { label: "Articles cached", value: counts.articles }),
        React.createElement(Row, { label: "Unread", value: counts.unread })
      ),
      React.createElement(
        Card,
        null,
        React.createElement(Row, {
          label: "Ticker enabled",
          value: settings.ticker_enabled != null ? settings.ticker_enabled : "—",
        }),
        React.createElement(Row, {
          label: "Refresh interval",
          value:
            settings.refresh_interval != null
              ? settings.refresh_interval + " s"
              : "—",
        }),
        React.createElement(Row, {
          label: "Max headlines kept",
          value: settings.max_headlines != null ? settings.max_headlines : "—",
        })
      ),
      React.createElement(
        Card,
        null,
        React.createElement(
          "div",
          { className: "mb-2 text-xs uppercase tracking-widest text-text-tertiary" },
          "Sources"
        ),
        state.sources.length === 0
          ? React.createElement(
              "div",
              { className: "text-sm text-text-tertiary" },
              "No sources configured yet — add feeds from the Hermes Desktop app (Settings → Plugins → Newswire)."
            )
          : React.createElement.apply(
              React,
              [
                "div",
                null,
              ].concat(
                state.sources.map(function (s, i) {
                  return React.createElement(Row, {
                    key: i,
                    label: s.name || s.feed_url || s.url || ("source " + (s.id != null ? s.id : i)),
                    value:
                      (s.enabled === false ? "disabled · " : "") +
                      (s.article_count != null ? s.article_count + " articles" : ""),
                  });
                })
              )
            )
      ),
      React.createElement(
        "div",
        { className: "text-xs text-text-tertiary" },
        "Read-only dashboard view. Feed management and the live ticker live in the Hermes Desktop app."
      )
    );
  }

  REG.register(PLUGIN, Status);
})();
