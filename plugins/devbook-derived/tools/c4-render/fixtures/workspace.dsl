workspace "Shop" "An online shop, one fixture for every view kind" {
    !identifiers hierarchical

    model {
        customer = person "Customer" "Buys things from the shop"
        clerk = person "Clerk" "Packs and ships orders"
        group "Shop company" {
            shop = softwareSystem "Shop" "Sells things online" {
                web = container "Web" "Serves the storefront" "ASP.NET Core"
                group "Backend" {
                    api = container "API" "Takes and tracks orders" "C#" {
                        orders = component "Orders" "Places and changes orders" "C# class"
                        stock = component "Stock" "Reserves stock for an order" "C# class"
                        notify = component "Notifier" "Tells the customer what happened" "C# class"
                        orders -> stock "Reserves stock with"
                        orders -> notify "Raises events on"
                    }
                    db = container "Database" "Holds orders and stock" "PostgreSQL" "Database"
                }
                web -> api "Calls" "HTTPS/JSON"
                api.orders -> db "Reads and writes" "EF Core"
                api.stock -> db "Reads and writes" "EF Core"
            }
            warehouse = softwareSystem "Warehouse" "Plans picking and shipping"
        }
        mail = softwareSystem "Mail" "Sends e-mail" "External"
        payments = softwareSystem "Payments" "Takes card payments" "External"

        customer -> shop.web "Browses and orders on" "HTTPS"
        clerk -> warehouse "Works the pick list in"
        shop.api.notify -> mail "Sends mail through" "SMTP"
        shop.api.orders -> payments "Charges the card with" "HTTPS"
        shop.api -> warehouse "Hands orders to" "AMQP"
        mail -> customer "Delivers mail to"

        live = deploymentEnvironment "Live" {
            cloud = deploymentNode "Cloud" "" "Azure" {
                gateway = infrastructureNode "Gateway" "Routes HTTPS traffic" "Application Gateway"
                app = deploymentNode "App Service" "" "Linux" "" "2" {
                    web = containerInstance shop.web
                    api = containerInstance shop.api
                }
                data = deploymentNode "Database server" "" "Azure Database for PostgreSQL" {
                    db = containerInstance shop.db
                }
                gateway -> app.web "Forwards requests to" "HTTPS"
            }
            site = deploymentNode "Warehouse site" "" "On premises" {
                planner = softwareSystemInstance warehouse
            }
        }
    }

    views {
        systemLandscape landscape "Everything the shop company runs and uses" {
            include *
        }
        systemContext shop context {
            include *
        }
        container shop containers {
            include *
            autolayout lr
        }
        component shop.api components {
            include *
        }
        dynamic shop checkout "How an order is placed" {
            customer -> shop.web "Places an order" "HTTPS"
            shop.web -> shop.api "Submits the order" "HTTPS/JSON"
            shop.api -> payments "Charges the card"
            shop.api -> shop.db "Saves the order"
            shop.api -> shop.web "Confirms the order"
            shop.web -> customer "Shows the confirmation"
        }
        deployment * live live "The shop as it runs in production" {
            include *
        }
    }
}
