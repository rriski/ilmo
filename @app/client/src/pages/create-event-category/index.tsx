import React, { useCallback, useState } from "react";
import { ApolloError } from "@apollo/client";
import { AuthRestrict, Redirect, SharedLayout } from "@app/components";
import {
  CreatedEventCategoryFragment,
  useCreateEventCategoryMutation,
  useSharedQuery,
} from "@app/graphql";
import {
  extractError,
  formItemLayout,
  getCodeFromError,
  tailFormItemLayout,
} from "@app/lib";
import * as Sentry from "@sentry/react";
import { Alert, Button, Col, Form, Input, PageHeader, Row, Select } from "antd";
import { NextPage } from "next";
import useTranslation from "next-translate/useTranslation";
import { Store } from "rc-field-form/lib/interface";

const { Option } = Select;

const CreateEventCategoryPage: NextPage = () => {
  const [formError, setFormError] = useState<Error | ApolloError | null>(null);
  const query = useSharedQuery();
  const { t } = useTranslation("events");
  const [form] = Form.useForm();

  const code = getCodeFromError(formError);
  const [
    eventCategory,
    setEventCategory,
  ] = useState<null | CreatedEventCategoryFragment>(null);
  const [createEventCategory] = useCreateEventCategoryMutation();

  const handleSubmit = useCallback(
    async (values: Store) => {
      setFormError(null);
      try {
        const { name, description, organization } = values;
        const { data } = await createEventCategory({
          variables: {
            name,
            desc: description,
            org_id: organization,
          },
        });
        setFormError(null);
        setEventCategory(data?.createEventCategory?.eventCategory || null);
      } catch (e) {
        setFormError(e);
        Sentry.captureException(e);
      }
    },
    [createEventCategory]
  );

  if (eventCategory) {
    return <Redirect layout href="/" />;
  }

  const organizationMemberships =
    query.data?.currentUser?.organizationMemberships?.nodes;
  if (organizationMemberships && organizationMemberships?.length <= 0) {
    return <Redirect layout href="/" />;
  }

  return (
    <SharedLayout title="" query={query} forbidWhen={AuthRestrict.LOGGED_OUT}>
      <Row>
        <Col flex={1}>
          <PageHeader title={t("createEventCategory.title")} />
          <div>
            <Form {...formItemLayout} form={form} onFinish={handleSubmit}>
              <Form.Item
                name="organization"
                label={t("organizer")}
                rules={[
                  {
                    required: true,
                    message: t("forms.rules.eventCategory.provideOrganizer"),
                  },
                ]}
              >
                <Select
                  placeholder={t("forms.placeholders.eventCategory.organizer")}
                  data-cy="createeventcategory-select-organization-id"
                >
                  {organizationMemberships?.map((a) => (
                    <Option value={a.organization?.id} key={a.organization?.id}>
                      {a.organization?.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item label={t("common:name")}>
                <Input.Group compact>
                  <Form.Item
                    name={["name", "fi"]}
                    noStyle
                    rules={[
                      {
                        required: true,
                        message: t("forms.rules.eventCategory.provideName"),
                      },
                    ]}
                  >
                    <Input
                      placeholder={t(
                        "forms.placeholders.eventCategory.inFinnish"
                      )}
                      data-cy="createeventcategory-input-name-fi"
                    />
                  </Form.Item>
                  <Form.Item
                    name={["name", "en"]}
                    noStyle
                    rules={[
                      {
                        required: true,
                        message: t("forms.rules.eventCategory.provideName"),
                      },
                    ]}
                  >
                    <Input
                      placeholder={t(
                        "forms.placeholders.eventCategory.inEnglish"
                      )}
                      style={{ marginTop: 5 }}
                      data-cy="createeventcategory-input-name-en"
                    />
                  </Form.Item>
                </Input.Group>
              </Form.Item>
              <Form.Item label={t("common:shortDescription")}>
                <Input.Group compact>
                  <Form.Item
                    name={["description", "fi"]}
                    noStyle
                    rules={[
                      {
                        required: true,
                        message: t(
                          "forms.rules.eventCategory.provideDescription"
                        ),
                      },
                    ]}
                  >
                    <Input.TextArea
                      placeholder={t(
                        "forms.placeholders.eventCategory.inFinnish"
                      )}
                      data-cy="createeventcategory-input-description-fi"
                    />
                  </Form.Item>
                  <Form.Item
                    name={["description", "en"]}
                    noStyle
                    rules={[
                      {
                        required: true,
                        message: t(
                          "forms.rules.eventCategory.provideDescription"
                        ),
                      },
                    ]}
                  >
                    <Input.TextArea
                      placeholder={t(
                        "forms.placeholders.eventCategory.inEnglish"
                      )}
                      style={{ marginTop: 5 }}
                      data-cy="createeventcategory-input-description-en"
                    />
                  </Form.Item>
                </Input.Group>
              </Form.Item>
              {formError ? (
                <Form.Item {...tailFormItemLayout}>
                  <Alert
                    type="error"
                    message={t("errors.eventCategoryCreationFailed")}
                    description={
                      <span>
                        {extractError(formError).message}
                        {code ? (
                          <span>
                            {" "}
                            ({t("error:errorCode")}: <code>ERR_{code}</code>)
                          </span>
                        ) : null}
                      </span>
                    }
                  />
                </Form.Item>
              ) : null}
              <Form.Item {...tailFormItemLayout}>
                <Button
                  htmlType="submit"
                  data-cy="createeventcategory-button-create"
                >
                  {t("common:create")}
                </Button>
              </Form.Item>
            </Form>
          </div>
        </Col>
      </Row>
    </SharedLayout>
  );
};

export default CreateEventCategoryPage;
