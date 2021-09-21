require("@app/config")
const compose = require("lodash/flowRight")
const { locales, defaultLocale } = require("./i18n.js")
const AntDDayjsWebpackPlugin = require("antd-dayjs-webpack-plugin")
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
})

if (!process.env.ROOT_URL) {
  if (process.argv[1].endsWith("/depcheck.js")) {
    /* NOOP */
  } else {
    throw new Error("ROOT_URL is a required envvar")
  }
}

const { NODE_ENV } = process.env
const isDevOrTest = NODE_ENV === "development" || NODE_ENV === "test"

module.exports = () => {
  const path = require("path")

  const withTM = require("next-transpile-modules")([
    "@app/components",
    "@app/lib",
  ])
  const withAntdLess = require("next-plugin-antd-less")
  const withNextTranslate = require("next-translate")

  return compose(
    withTM,
    withAntdLess,
    withNextTranslate,
    withBundleAnalyzer
  )({
    experimental: { esmExternals: true },
    reactStrictMode: true,
    useFileSystemPublicRoutes: true,
    poweredByHeader: false,
    trailingSlash: false,
    lessVarsFilePath: path.resolve(__dirname, "./src/styles/antd-custom.less"),
    lessVarsFilePathAppendToEndOfContent: false,
    cssLoaderOptions: {
      esModule: false,
      sourceMap: false,
      modules: {
        mode: "local",
      },
    },
    i18n: {
      locales,
      defaultLocale,
    },
    images: {
      domains: isDevOrTest
        ? ["localhost", "static.prodeko.org", "placeimg.com"]
        : ["ilmo3.prodeko.org", "static.prodeko.org"],
    },
    env: {
      CI: process.env.CI,
      ENV: process.env.NODE_ENV,
      ROOT_URL: process.env.ROOT_URL,
      T_AND_C_URL: process.env.T_AND_C_URL,
      SENTRY_DSN: process.env.SENTRY_DSN,
      ENABLE_REGISTRATION: process.env.ENABLE_REGISTRATION,
      TZ: process.env.TZ,
    },
    webpack(config, { webpack, dev, isServer }) {
      const makeSafe = (externals) => {
        if (Array.isArray(externals)) {
          return externals.map((ext) => {
            if (typeof ext === "function") {
              return ({ request, ...rest }, callback) => {
                if (/^@app\//.test(request)) {
                  callback()
                } else {
                  return ext({ request, ...rest }, callback)
                }
              }
            } else {
              return ext
            }
          })
        }
      }

      const externals =
        isServer && dev ? makeSafe(config.externals) : config.externals

      if (!isServer) {
        config.resolve.fallback.fs = false
      }

      return {
        ...config,
        plugins: [
          ...config.plugins,
          new webpack.IgnorePlugin(
            // These modules are server-side only; we don't want webpack
            // attempting to bundle them into the client.
            /^(node-gyp-build|bufferutil|utf-8-validate)$/
          ),
          new AntDDayjsWebpackPlugin(),
        ],
        externals: [
          ...(externals || []),
          isServer ? { "pg-native": "pg/lib/client" } : null,
        ].filter((_) => _),
      }
    },
  })
}
