workspace "shop" {

    !identifiers hierarchical

    model {
        shop = softwareSystem "Shop" "Sells products and takes orders." {
            api = container "API" "Serves the shop." "ASP.NET Core" {
                ordering = component "Ordering" "Takes and changes orders." "C#"
                catalog = component "Catalog" "Lists what the shop sells." "C#"
            }
        }
    }

    views {
        !include c4/generated/code.dsl
    }
}
