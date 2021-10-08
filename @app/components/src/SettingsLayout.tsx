import qs from "querystring"

import { Layout, Menu, Typography } from "antd"
import { TextProps } from "antd/lib/typography/Text"
import Link from "next/link"
import { useRouter } from "next/router"
import { Translate } from "next-translate"
import useTranslation from "next-translate/useTranslation"

import { Redirect } from "./Redirect"
import {
  AuthRestrict,
  contentMinHeight,
  SharedLayout,
  SharedLayoutChildProps,
  SharedLayoutProps,
} from "./SharedLayout"
import { StandardWidth } from "./StandardWidth"
import { Warn } from "./Warn"

const { Text } = Typography
const { Sider, Content } = Layout

interface PageSpec {
  title: string
  cy: string
  warnIfUnverified?: boolean
  titleProps?: TextProps
}

// TypeScript shenanigans (so we can still use `keyof typeof pages` later)
function page(spec: PageSpec): PageSpec {
  return spec
}

const pages = (t: Translate) => ({
  "/settings": page({
    title: t("titles.index"),
    cy: "settingslayout-link-profile",
  }),
  "/settings/security": page({
    title: t("titles.security"),
    cy: "settingslayout-link-password",
  }),
  "/settings/accounts": page({
    title: t("titles.accounts"),
    cy: "settingslayout-link-accounts",
  }),
  "/settings/emails": page({
    title: t("titles.emails"),
    warnIfUnverified: true,
    cy: "settingslayout-link-emails",
  }),
  "/settings/delete": page({
    title: t("titles.delete"),
    titleProps: {
      type: "danger",
    },
    cy: "settingslayout-link-delete",
  }),
})

export interface SettingsLayoutProps {
  query: SharedLayoutProps["query"]
  href: keyof ReturnType<typeof pages>
  children: React.ReactNode
}

export function SettingsLayout({
  query,
  href: inHref,
  children,
}: SettingsLayoutProps) {
  const { t } = useTranslation("settings")
  const sideMenuItems = pages(t)
  const href = sideMenuItems[inHref] ? inHref : Object.keys(sideMenuItems)[0]
  const page = sideMenuItems[href]
  const router = useRouter()
  const fullHref =
    href + (router && router.query ? `?${qs.stringify(router.query)}` : "")
  return (
    <SharedLayout
      forbidWhen={AuthRestrict.LOGGED_OUT}
      query={query}
      title={`${t("common:settings")}: ${page.title}`}
      noPad
    >
      {({ currentUser, error, fetching }: SharedLayoutChildProps) =>
        !currentUser && !error && !fetching ? (
          <Redirect href={`/login?next=${encodeURIComponent(fullHref)}`} />
        ) : (
          <Layout style={{ minHeight: contentMinHeight }} hasSider>
            <Sider>
              <Menu selectedKeys={[href]}>
                {Object.keys(sideMenuItems).map((pageHref) => (
                  <Menu.Item key={pageHref}>
                    <Link href={pageHref}>
                      <a data-cy={sideMenuItems[pageHref].cy}>
                        <Warn
                          okay={
                            !currentUser ||
                            currentUser.isVerified ||
                            !sideMenuItems[pageHref].warnIfUnverified
                          }
                        >
                          <Text {...sideMenuItems[pageHref].titleProps}>
                            {sideMenuItems[pageHref].title}
                          </Text>
                        </Warn>
                      </a>
                    </Link>
                  </Menu.Item>
                ))}
              </Menu>
            </Sider>
            <Content>
              <StandardWidth>{children}</StandardWidth>
            </Content>
          </Layout>
        )
      }
    </SharedLayout>
  )
}
