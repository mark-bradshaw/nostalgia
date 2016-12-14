var seed;
var addresses = new Set();

var iotajs = new IOTA({
    'host': 'http://localhost',
    'port': 14265
});

var shouldSpam = false;

function generateNewAddress() {

    alert("This will take a few minutes to complete!");

    iotajs.api.getNewAddress(seed, function(error, success) {

        var address = success;

        console.log("Prepared Address (without checksum): ", address);
        console.log("Prepared Address (with checksum): ", iotajs.utils.addChecksum(address));

        if (!error) {

            transfer(success, function(error, transaction) {

                addresses.add(address);
                addElementsToTable(transaction);
            });

        } else {
            console.log("ERROR", error);
        }
    })
}

function addElementsToTable(bundles) {
    var txValue = 0;
    var content = '';

    var trs = [];
    bundles.forEach(function(bundleEl) {
        var persistence = bundles[0].persistence ? bundles[0].persistence : false;

        var tr = document.createElement('tr');
        if (bundleEl.currentIndex === 0) {
            if (bundleEl.value && Array.from(addresses).indexOf(bundleEl.address) === -1) {
                tr.className = 'danger';
            }

            var getBundleBtn = '';
            if (bundles.length > 1) {
                getBundleBtn = "<button data-toggle='collapse' data-target='." + bundles[0].hash + "' type='button' class='btn btn-primary'>Show bundle</button>";
            }

            tr.innerHTML = "<td>" + new Date(bundles[0].timestamp * 1000) + "</td><td>" + iotajs.utils.addChecksum(bundles[0].address) + "</td><td>" + bundleEl.value + "</td><td>" + getBundleBtn + "</td><td><button type='button' class='btn btn-primary' onclick=\"replayTransfer('" + bundles[0].hash + "');\">" + persistence +"</button></td>";
        } else {
            tr.className = "collapse out " + bundles[0].hash + " info";
            tr.innerHTML = "<td>" + new Date(bundleEl.timestamp * 1000) + "</td><td>" + bundleEl.address + "</td><td>" + bundleEl.value + "</td><td></td><td></td></tr>";
        }
        trs.push(tr);
    });

    // Get rid of existing rows except header row and total row.
    var rows = document.querySelectorAll('#txTable tr');
    var totalRow = Array.prototype.slice.call(rows, -1)[0];
    Array.prototype.slice.call(rows, 1).forEach(function(e) { e.remove(); });

    var table = document.querySelector('#txTable tbody');
    trs.forEach(function(tr) { table.appendChild(tr); });

    // Put the total row back in
    table.appendChild(totalRow);
}

function replayTransfer(tail) {

    alert("Replaying your Transfer now. This can take some time");

    iotajs.api.replayBundle(tail, 3, 18, function(error, transaction) {

        if (transaction) {
            alert("Replay was Successful!");

            addElementsToTable(transaction);
        }
    })
}

function transfer(address, callback) {

    if (address) {

        var transfers = [{
            'address': address,
            'value': 0
        }]

        iotajs.api.sendTransfer(seed, 9, 18, transfers, callback)

    } else {

        var address = prompt("address"), valueToTransfer;
        if (address == null) {
            alert("The transfer has been cancelled!");
        } else {

            var valueToTransfer = prompt("Value to transfer to '" + address + "'");

            if (valueToTransfer == null || isNaN(valueToTransfer)) {

                alert("The transfer has been canceled!");

            } else {

                var message = prompt("Message (can be empty): ");
                var tag = prompt("Tag for your Tx (can be empty): ");

                // Check if message and tag are correct trytes
                if (!iotajs.validate.isTrytes(message) || !iotajs.validate.isTrytes(tag));

                var transfers = [{
                    'address': address,
                    'value': parseInt(valueToTransfer),
                    'message': message,
                    'tag': tag
                }]

                alert("This will take a few minutes to complete!");
                iotajs.api.sendTransfer(seed, 9, 18, transfers, transferCallback);
            }
        }
    }
}

function transferCallback(error, transaction) {
    if (error) {
        alert("The transfer has failed! Make sure you have enough CONFIRMED iotas.");
    } else {
        alert("The transfer has been broadcast.");

        addElementsToTable(transaction);
    }
}

function getTransfers() {
    iotajs.api.getTransfers(seed, {'inclusionStates': true}, function(error, bundles) {
        if (!error) {
            console.log(bundles);
            getTransfersCallback(seed, bundles);
        } else {
            console.log(error);
        }
    })
}

function getTransfersCallback(seed, bundles) {
    // Very expensive call
    // Simply to cross check and make sure that the balance of the user is correct
    iotajs.api.getNewAddress(seed, {'returnAll': true}, function(error, allAddresses) {

        allAddresses.forEach(function(addr) {
            addresses.add(addr);
        });

        addElementsToTable(bundles);

        iotajs.api.getBalances(allAddresses, 100, function(error, balances) {

            var totalValue = 0;
            balances.balances.forEach(function(balance) {
                totalValue += parseInt(balance);
            });

            document.getElementById('total').innerHTML = totalValue;
        })
    })
}

function startSpam() {
    shouldSpam = true;
    var spamCount = 0;

    console.log("STARTED SPAMMING");

    var transfers = [{
        'address': '999999999999999999999999999999999999999999999999999999999999999999999999999999999',
        'value': 0,
        'message': 'DOMISWAYTOOFUCKINGCOOL',
        'tag': 'TOTALLY'
    }]

    async.doWhilst(function(callback) {

        iotajs.api.sendTransfer('999999999999999999999999999999999999999999999999999999999999999999999999999999999', 3, 18, transfers, function(e,s) {
            console.log(s);
            console.log("Spam Count: ", spamCount);
            spamCount += 1;
            callback(null);
        })

    }, function() {

        return shouldSpam === true;
    }, function() {
        console.log("STOPPED SPAMMING")
    })
}

function stopSpam() {
    console.log("Stopped");
    shouldSpam = false;
    iotajs.api.interruptAttachingToTangle();
}

function setSeed(value) {
    var i;
    seed = "";
    for (i = 0; i < value.length; i++) {
        if (("9ABCDEFGHIJKLMNOPQRSTUVWXYZ").indexOf(value.charAt(i)) < 0) {
            seed += "9";
        } else {
            seed += value.charAt(i);
        }
    }
    while (seed.length < 81) {
        seed += "9";
    }
    if (seed.length > 81) {
        seed = seed.slice(0, 81);
    }

    document.getElementById('setSeed').style.display = 'none';
    document.getElementById('transfers').style.display = 'block';
}
