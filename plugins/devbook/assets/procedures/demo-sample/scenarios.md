# Scenarios

```meta
type: scenarios
```

The journey the sample demo's playthrough plays end to end, so a host can recompute its
signature and check the copy embedded in `features.demo.html`.

## A declined card is retried

```meta
type: scenario
```

A buyer's card is declined at checkout, they pay with another, and find the order in their list.

### The card is declined

- **Given** a buyer with 6 lines in the basket
- **When** they place the order and the bank declines the card
- **Then** the checkout says the card was declined and nothing was charged

### Another card places the order

- **When** they try again with another card
- **Then** the order is placed and its number shown

### The order is in the list

- **When** they open their orders
- **Then** the order is listed with its total and status
