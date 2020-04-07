/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

function handleDead({ bookmark, error }) {
    if (document.getElementById("bookmark-" + bookmark.id))
        return;

    const li = document.createElement("li")
    li.id = "bookmark-" + bookmark.id;

    const input = document.createElement("input");
    input.type = "checkbox";
    li.append(input)

    li.append(" ")

    const a = document.createElement("a");
    a.href = bookmark.url;
    a.textContent = bookmark.title || bookmark.url;
    a.target = "_blank";
    li.append(a);

    if (error == "TypeError: NetworkError when attempting to fetch resource.") {
        error = "NetworkError";
    }

    let maybe404 = false;
    if (error === -404) {
        li.classList.add("maybe-404");

        maybe404 = true;
        error = "potentially working 404";
    }

    li.append(` (${error})`);

    if (maybe404) {
        // Add to end of 404 list
        document.getElementById("404-errors").append(li);
    } else if (error == 404) {
        let el = document.querySelector(".maybe-404");
        if (el) {
            // Add before the list of "maybe 404"
            el.parentNode.insertBefore(li, el);
        } else {
            document.getElementById("404-errors").append(li)
        }
    } else {
        document.getElementById("other-errors").append(li)
    }
}

function handleAlive({ id, found }) {
    const li = document.getElementById("bookmark-" + id);
    if (li) {
        const ul = document.querySelector("ul");
        ul.removeChild(li);
    }

    document.querySelector("#live").textContent = found;
}

function onMessage(message) {
    if (message.type === "dead") {
        handleDead(message);
    } else if (message.type === "alive") {
        handleAlive(message);
    }
}

chrome.runtime.onMessage.addListener(onMessage);
// Send a message to start checkdead
chrome.runtime.sendMessage({ type: "find_dead" });

function update(name) {
    const ctr = document.getElementById(name);

    const selected = ctr.querySelectorAll("input:checked").length;
    const removal = ctr.querySelector("a.remove");
    if (selected === 0) {
        removal.classList.add("disabled");
        removal.textContent = "Select bookmarks to remove";
    } else if (selected === 1) {
        removal.classList.remove("disabled");
        removal.textContent = "Remove 1 bookmark";
    } else {
        removal.classList.remove("disabled");
        removal.textContent = `Remove ${selected} bookmarks`;
    }
}

document.body.addEventListener("click", function (event) {
    const t = event.target;
    if (t.classList.contains("select-all")) {
        for (let input of t.parentNode.querySelectorAll("input")) {
            input.checked = true;
        }
        event.preventDefault();
    } else if (t.classList.contains("remove")) {
        const toRemove = t.parentNode.querySelectorAll("li > input:checked");
        if (toRemove.length >= 5) {
            if (!confirm(`Are you sure you want to remove ${toRemove.length} bookmarks? This operation cannot be undone.`))
                return;
        }

        for (let node of toRemove) {
            node = node.parentNode; // Selected input, but want li.
            chrome.runtime.sendMessage({ type: "remove", id: node.id.replace("bookmark-", "") });
            node.remove();
        }
        event.preventDefault();
    }

    update("404-errors-ctr");
    update("other-errors-ctr");
});

