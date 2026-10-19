workspace "<System name>" "The C4 model of <System name>." {
    !identifiers hierarchical

    model {
        user = person "<Person name>" "<Who uses the system, in one line.>"
        system = softwareSystem "<System name>" "<What the system does, in one line.>"

        user -> system "<What the person does with it>"
    }

    views {
        systemContext system context "System context" {
            include *
        }
    }
}
