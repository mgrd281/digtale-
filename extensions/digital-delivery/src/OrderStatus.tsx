import { useEffect, useState } from "react";
import {
  reactExtension,
  useApi,
  BlockStack,
  InlineStack,
  Heading,
  Text,
  Button,
  Banner,
  Spinner,
  Divider,
} from "@shopify/ui-extensions-react/customer-account";
import { fetchDeliveries, type DeliveriesResponse } from "./deliveries";

export default reactExtension(
  "customer-account.order-status.block.render",
  () => <DeliveryBlock />,
);

function DeliveryBlock() {
  const api = useApi();
  const [data, setData] = useState<DeliveriesResponse | null>(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let active = true;
    fetchDeliveries(api, "order-status")
      .then((res) => active && setData(res))
      .catch(() => active && setErrored(true));
    return () => {
      active = false;
    };
  }, [api]);

  if (errored) {
    return (
      <Banner status="info" title="Ihr digitales Produkt">
        <Text>
          Ihre Lieferung wird vorbereitet. Sie erhalten in Kürze eine E-Mail mit
          Ihrem Lizenzschlüssel und Download-Link.
        </Text>
      </Banner>
    );
  }

  if (!data) {
    return (
      <InlineStack blockAlignment="center" spacing="base">
        <Spinner />
        <Text>Ihr digitales Produkt wird geladen …</Text>
      </InlineStack>
    );
  }

  if (data.pending || data.items.length === 0) {
    return (
      <Banner status="info" title={data.heading}>
        <Text>{data.pendingMessage}</Text>
      </Banner>
    );
  }

  return (
    <BlockStack spacing="loose">
      <Heading level={2}>{data.heading}</Heading>
      {data.items.map((item, i) => (
        <BlockStack key={i} spacing="tight">
          <Text emphasis="bold">{item.productTitle}</Text>
          {item.licenseKey && (
            <BlockStack spacing="extraTight">
              <Text appearance="subdued" size="small">
                {data.keyLabel}
              </Text>
              <Text emphasis="bold">{item.licenseKey}</Text>
            </BlockStack>
          )}
          {item.downloads.map((d, j) => (
            <Button key={j} to={d.url} kind="primary">
              {data.downloadButton}
            </Button>
          ))}
          {item.downloads.length > 0 && (
            <Text appearance="subdued" size="small">
              {data.legal}
            </Text>
          )}
        </BlockStack>
      ))}
      <Divider />
    </BlockStack>
  );
}
