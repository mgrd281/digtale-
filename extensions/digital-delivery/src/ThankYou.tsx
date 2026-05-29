import { useEffect, useState } from "react";
import {
  reactExtension,
  useApi,
  View,
  BlockStack,
  InlineStack,
  Heading,
  Text,
  Button,
  Banner,
  Spinner,
} from "@shopify/ui-extensions-react/checkout";
import { fetchDeliveries, type DeliveriesResponse } from "./deliveries";

export default reactExtension("purchase.thank-you.block.render", () => (
  <DeliveryBlock />
));

function DeliveryBlock() {
  const api = useApi();
  const [data, setData] = useState<DeliveriesResponse | null>(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let active = true;
    // Poll a few times: the orders/paid webhook may land a moment after the
    // Thank-you page first renders, so the first fetch can still be "pending".
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      fetchDeliveries(api, "checkout")
        .then((res) => {
          if (!active) return;
          setData(res);
          if (res.pending && attempts < 5) {
            attempts += 1;
            timer = setTimeout(tick, 2500);
          }
        })
        .catch(() => active && setErrored(true));
    };
    tick();

    return () => {
      active = false;
      clearTimeout(timer);
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

  // Nothing to deliver for this order (product not set up) → show nothing.
  if (data.hide) {
    return null;
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
        <View key={i} border="base" cornerRadius="large" padding="base">
          <BlockStack spacing="base">
            <Heading level={3}>{item.productTitle}</Heading>

            {item.message && <Text>{item.message}</Text>}

            {item.licenseKey && (
              <View border="base" cornerRadius="base" padding="base">
                <BlockStack spacing="extraTight">
                  <Text appearance="subdued" size="small">
                    {data.keyLabel}
                  </Text>
                  <Text emphasis="bold" size="large">
                    {item.licenseKey}
                  </Text>
                </BlockStack>
              </View>
            )}

            {item.downloads.length > 0 && (
              <BlockStack spacing="tight">
                {item.downloads.map((d, j) => (
                  <BlockStack key={j} spacing="extraTight">
                    <Text size="small">{d.fileName}</Text>
                    <Button to={d.url} kind="primary">
                      {data.downloadButton}
                    </Button>
                  </BlockStack>
                ))}
                <Text appearance="subdued" size="small">
                  {data.legal}
                </Text>
              </BlockStack>
            )}
          </BlockStack>
        </View>
      ))}
    </BlockStack>
  );
}
