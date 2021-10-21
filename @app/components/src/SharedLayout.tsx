import React, { useCallback } from "react"
import { DownOutlined } from "@ant-design/icons"
import headerLogo from "@app/client/assets/images/header-logo.png"
import { orgName, projectName } from "@app/config"
import {
  SharedLayout_QueryFragment,
  SharedLayout_UserFragment,
  useCurrentUserUpdatedSubscription,
  useLogoutMutation,
} from "@app/graphql"
import {
  Avatar,
  Col,
  Dropdown,
  Layout,
  Menu,
  message,
  Row,
  Typography,
} from "antd"
import Head from "next/head"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/router"
import useTranslation from "next-translate/useTranslation"
import { CombinedError, UseQueryState } from "urql"

import {
  ErrorResult,
  H3,
  LocaleSelect,
  Redirect,
  StandardWidth,
  useIlmoContext,
  useIsMobile,
  Warn,
} from "."

const { Header, Content, Footer } = Layout
const { Text } = Typography
/*
 * For some reason, possibly related to the interaction between
 * `babel-plugin-import` and https://github.com/babel/babel/pull/9766, we can't
 * directly export these values, but if we reference them and re-export then we
 * can.
 *
 * TODO: change back to `export { Row, Col, Link }` when this issue is fixed.
 */
const _babelHackRow = Row
const _babelHackCol = Col
export { _babelHackCol as Col, Link, _babelHackRow as Row }

export const contentMinHeight = "calc(100vh - 64px - 70px)"
export const contentMaxWidth = "75rem"

export interface SharedLayoutChildProps {
  error?: CombinedError | Error
  fetching: boolean
  currentUser?: SharedLayout_UserFragment | null
}

export enum AuthRestrict {
  NEVER = 0,
  LOGGED_OUT = 1 << 0,
  LOGGED_IN = 1 << 1,
  NOT_ADMIN = 1 << 2,
}

export interface SharedLayoutProps {
  /*
   * We're expecting lots of different queries to be passed through here, and
   * for them to have this common required data we need. Methods like
   * `subscribeToMore` are too specific (and we don't need them) so we're going
   * to drop them from the data requirements.
   *
   * NOTE: we're not fetching this query internally because we want the entire
   * page to be fetchable via a single GraphQL query, rather than multiple
   * chained queries.
   */
  query: UseQueryState<SharedLayout_QueryFragment>

  title: string
  titleHref?: string
  titleHrefAs?: string
  children:
    | React.ReactNode
    | ((props: SharedLayoutChildProps) => React.ReactNode)
  noPad?: boolean
  noHandleErrors?: boolean
  forbidWhen?: AuthRestrict
  sider?: React.ReactNode
  displayFooter?: boolean
}

export function SharedLayout({
  title,
  titleHref,
  titleHrefAs,
  noPad = false,
  noHandleErrors = false,
  query,
  forbidWhen = AuthRestrict.NEVER,
  sider,
  children,
  displayFooter = true,
}: SharedLayoutProps) {
  const router = useRouter()
  const currentUrl = router?.asPath
  const [, logout] = useLogoutMutation()
  const { t } = useTranslation("common")
  const isMobile = useIsMobile()
  const context = useIlmoContext()

  const forbidsLoggedIn = forbidWhen & AuthRestrict.LOGGED_IN
  const forbidsLoggedOut = forbidWhen & AuthRestrict.LOGGED_OUT
  const forbidsNotAdmin = forbidWhen & AuthRestrict.NOT_ADMIN

  const isSSR = typeof window === "undefined"

  const handleLogout = useCallback(() => {
    const reset = async () => {
      router.events.off("routeChangeComplete", reset)
      try {
        await logout()
        context.resetUrqlClient()
      } catch (e) {
        // Something went wrong; redirect to /logout to force logout.
        window.location.href = "/logout"
      }
    }
    router.events.on("routeChangeComplete", reset)
    router.push("/")
  }, [logout, context, router])

  const renderChildren = (props: SharedLayoutChildProps) => {
    const inner =
      props.error && !props.fetching && !noHandleErrors ? (
        <ErrorResult error={props.error} />
      ) : typeof children === "function" ? (
        children(props)
      ) : (
        children
      )

    if (
      data &&
      data.currentUser &&
      (forbidsLoggedIn || (forbidsNotAdmin && !data.currentUser.isAdmin))
    ) {
      if (!isSSR) {
        // Antd messages don't work with SSR
        message.error({
          key: "access-denied",
          content: `${t("error:accessDenied")}`,
        })
      }
      return <Redirect href="/" />
    } else if (
      data?.currentUser === null &&
      !fetching &&
      !error &&
      forbidsLoggedOut
    ) {
      return (
        <Redirect href={`/login?next=${encodeURIComponent(router.asPath)}`} />
      )
    }

    return noPad ? inner : <StandardWidth>{inner}</StandardWidth>
  }

  const { data, fetching, error } = query

  /*
   * This will set up a GraphQL subscription monitoring for changes to the
   * current user. Interestingly we don't need to actually _do_ anything - no
   * rendering or similar - because the payload of this mutation will
   * automatically update Urql's cache which will cause the data to be
   * re-rendered wherever appropriate.
   */
  useCurrentUserUpdatedSubscription({
    // Skip checking for changes to the current user if
    // current user does not exist
    pause: !data?.currentUser,
  })

  return (
    <Layout>
      <Header
        style={{
          boxShadow: "0 2px 8px #f0f1f2",
          zIndex: 1,
          overflow: "hidden",
        }}
      >
        <Head>
          <title>{title ? `${title} — ${projectName}` : projectName}</title>
        </Head>
        <Row justify="space-between" wrap={false}>
          <Col flex="auto" style={{ padding: "5px 0" }}>
            <Link href="/">
              <a>
                <Image
                  alt="Prodeko"
                  height={50}
                  placeholder="blur"
                  src={headerLogo}
                  width={50}
                  priority
                />
              </a>
            </Link>
          </Col>
          {!isMobile ? (
            <Col lg={{ span: 16 }} md={{ span: 13 }} sm={{ span: 10 }}>
              <H3
                data-cy="layout-header-title"
                style={{
                  margin: 0,
                  padding: 0,
                  textAlign: "center",
                  lineHeight: "64px",
                }}
              >
                {titleHref ? (
                  <Link as={titleHrefAs} href={titleHref}>
                    <a data-cy="layout-header-titlelink">{title}</a>
                  </Link>
                ) : (
                  title
                )}
              </H3>
            </Col>
          ) : null}
          <Col flex="auto" style={{ textAlign: "right" }}>
            <LocaleSelect />
          </Col>
          <Col
            lg={{ span: 2 }}
            md={{ span: 4 }}
            style={{ textAlign: "left" }}
            xs={{ span: 6 }}
          >
            {data && data.currentUser ? (
              <Dropdown
                overlay={
                  <Menu>
                    {data.currentUser.isAdmin && (
                      <Menu.Item key="admin">
                        <Link href="/admin/event/list">
                          <a data-cy="layout-link-admin">{t("admin")}</a>
                        </Link>
                      </Menu.Item>
                    )}
                    <Menu.Item key="settings">
                      <Link href="/settings/profile">
                        <a data-cy="layout-link-settings">
                          <Warn okay={data.currentUser.isVerified}>
                            {t("settings")}
                          </Warn>
                        </a>
                      </Link>
                    </Menu.Item>
                    <Menu.Item key="logout">
                      <a onClick={handleLogout}>{t("logout")}</a>
                    </Menu.Item>
                  </Menu>
                }
                trigger={["click"]}
              >
                <span
                  data-cy="layout-dropdown-user"
                  style={{ whiteSpace: "nowrap" }}
                >
                  <Avatar>
                    {(data.currentUser.name && data.currentUser.name[0]) || "?"}
                  </Avatar>
                  <Warn okay={data.currentUser.isVerified}>
                    <span style={{ marginLeft: 8, marginRight: 8 }}>
                      {data.currentUser.name}
                    </span>
                    <DownOutlined />
                  </Warn>
                </span>
              </Dropdown>
            ) : forbidsLoggedIn ? null : (
              <Link href={`/login?next=${encodeURIComponent(currentUrl)}`}>
                <a data-cy="header-login-button">{t("signin")}</a>
              </Link>
            )}
          </Col>
        </Row>
      </Header>
      <Layout hasSider={!!sider}>
        {sider ? sider : null}
        <Content style={{ minHeight: contentMinHeight }}>
          {renderChildren({
            error,
            fetching,
            currentUser: data?.currentUser,
          })}
        </Content>
      </Layout>

      {displayFooter && (
        <Footer>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
            }}
          >
            <Text>
              &copy; {new Date().getFullYear()} {orgName}.{" "}
              {process.env.PRIVACY_URL && (
                <span>
                  <a
                    href={process.env.PRIVACY_URL}
                    style={{ textDecoration: "underline" }}
                  >
                    {t("privacyPolicy")}
                  </a>
                </span>
              )}
            </Text>
          </div>
        </Footer>
      )}
    </Layout>
  )
}
