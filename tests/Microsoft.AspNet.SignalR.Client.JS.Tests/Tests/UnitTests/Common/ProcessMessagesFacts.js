﻿QUnit.module("Transports Common - Process Messages Facts");

QUnit.test("Noop's on missing transport", function () {
    var connection = testUtilities.createConnection(),
        lastKeepAlive = false;

    // Ensure the connection can utilize the keep alive features
    connection.keepAliveData = {
        lastKeepAlive: lastKeepAlive,
        activated: true
    };

    $.signalR.transports._logic.processMessages(connection);
    QUnit.ok(connection.keepAliveData.lastKeepAlive === lastKeepAlive, "Should have not altered the keep alive because we should have done a full noop when no transport specified.");
});

QUnit.test("Updates keep alive data on any message retrieval.", function () {
    var connection = testUtilities.createConnection(),
        response = {
            C: 1234,
            M: [{ uno: 1, dos: 2 }, { tres: 3, quatro: 4 }],
            L: 1337,
            G: "foo"
        },
        lastKeepAlive = false;

    // Ensure the connection can utilize the keep alive features
    connection.keepAliveData = {
        lastKeepAlive: lastKeepAlive,
        activated: true
    };

    connection.transport = {
        supportsKeepAlive: true
    };

    // No message, should noop but still update time stamp
    $.signalR.transports._logic.processMessages(connection);
    QUnit.ok(connection.keepAliveData.lastKeepAlive !== lastKeepAlive, "Sent null data, the last keep alive time (" + connection.keepAliveData.lastKeepAlive + ") should be different than " + lastKeepAlive);

    lastKeepAlive = connection.keepAliveData.lastKeepAlive;
    $.signalR.transports._logic.processMessages(connection, response);
    QUnit.ok(connection.keepAliveData.lastKeepAlive !== lastKeepAlive, "Sent valid data, the last keep alive time (" + connection.keepAliveData.lastKeepAlive + ") should be different than " + lastKeepAlive);
});

QUnit.test("Noop's on keep alive", function () {
    var connection = testUtilities.createConnection(),
        savedMaximizePersistentResponse = $.signalR.transports._logic.maximizePersistentResponse,
        failed = false;

    connection.transport = "foo";

    $.signalR.transports._logic.maximizePersistentResponse = function () {
        QUnit.ok(false, "Tried to maximize a message on keep alive.");
        failed = true;
    };

    $.signalR.transports._logic.processMessages(connection);

    if (!failed) {
        QUnit.ok(true, "Noop'd on null data (equivalent to keep alive).");
    }

    $.signalR.transports._logic.maximizePersistentResponse = savedMaximizePersistentResponse;
});

QUnit.test("Handles disconnect command correctly", function () {
    var connection = testUtilities.createConnection(),
        response = {
            C: 1234,
            M: [{ uno: 1, dos: 2 }, { tres: 3, quatro: 4 }],
            D: true,
            L: 1337,
            G: "foo"
        };

    connection.transport = {};
    connection.stop = function (async, notifyServer) {
        QUnit.ok(!async, "Disconnect commands should not be asynchronous.");
        QUnit.ok(!notifyServer, "Disconnect commands should not notify the server.");
        QUnit.ok(true, "Disconnect command should result in the connection trying to be stopped.");
    };

    $.signalR.transports._logic.processMessages(connection, response);
});

QUnit.test("Updates group on message retrieval.", function () {
    var connection = testUtilities.createConnection(),
        response = {
            C: 1234,
            M: [{ uno: 1, dos: 2 }, { tres: 3, quatro: 4 }],
            L: 1337,
            G: "foo"
        },
        updateGroupsCount = 0,
        savedUpdateGroups = $.signalR.transports._logic.updateGroups;

    connection.transport = {};

    $.signalR.transports._logic.updateGroups = function () {
        updateGroupsCount++;
    };

    $.signalR.transports._logic.processMessages(connection, response);
    QUnit.ok(updateGroupsCount === 1, "Update groups is called with generic message.");

    // Turn the disconnect flag on.  We should not update groups in this scenario
    response.D = true;
    $.signalR.transports._logic.processMessages(connection, response);
    QUnit.ok(updateGroupsCount === 1, "Update groups is not called when we have a disconnect command.");

    $.signalR.transports._logic.processMessages(connection);
    QUnit.ok(updateGroupsCount === 1, "Update groups is not called when we have a keep alive.");

    $.signalR.transports._logic.updateGroups = savedUpdateGroups;
});

QUnit.test("Triggeres received handler for each message.", function () {
    var connection = testUtilities.createHubConnection(),
        demo = connection.createHubProxies().demo,
        response = {
            C: 1234,
            M: [{ H: "demo", M: "foo", A: [], S: { value: 555 } }, { H: "demo", M: "foo", A: [], S: { value: 782 } }],
            L: 1337,
            G: "foo"
        },
        accruedValue = 0;

    connection.transport = {};
    demo.client.foo = function () { };

    connection.received(function (data) {
        accruedValue += data.S.value;
    });

    $.signalR.transports._logic.processMessages(connection, response);
    QUnit.ok(accruedValue === 1337, "Received handler is called for each message in queue.");
});

QUnit.test("Message ID is set on connection ID when set.", function () {
    var connection = testUtilities.createConnection(),
        response = {
            M: false,
            L: 1337,
            G: "foo"
        };

    connection.transport = {};

    // No message ID set
    $.signalR.transports._logic.processMessages(connection, response);
    QUnit.isNotSet(connection.messageId, "No message Id is set if there is no message Id in the message.");

    response.C = 1234;
    $.signalR.transports._logic.processMessages(connection, response);
    QUnit.ok(connection.messageId === 1234, "The connection's messageId property is set when a message contains a messageId");
});