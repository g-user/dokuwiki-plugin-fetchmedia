jQuery(() => {
    'use strict';

    const $form = jQuery('#fetchmedia_form');


    function* flattenLinks(data) {
        yield* Object.entries(data).reduce((carry, [page, links]) => {
            const flatLinks = links.map(link => [page, link]);
            return carry.concat(flatLinks);
        }, []);
    }

    function requestDownloadExternalFile(linkGen) {
        const { value, done } = linkGen.next();
        if (done) {
            return;
        }

        const [page, link] = value;

        fetch(
            DOKU_BASE + 'lib/exe/ajax.php',
            {
                method: 'POST',
                headers: new Headers({ 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8' }),
                body: Object.entries({
                    call: 'plugin_fetchmedia_downloadExternalFile',
                    page: page,
                    link: link,
                }).map(([k, v]) => {
                    return k + '=' + encodeURIComponent(v);
                }).join('&'),
                credentials: 'include',
            },
        )
            .then((res) => {
                console.log('success');
                console.log(res);
                const selector = `li[data-id="${btoa(page + link)}"]`;
                console.log(selector);
                const li = document.querySelector(selector);
                const STATUS_OK = 200;
                if (res.status === STATUS_OK) {
                    li.textContent += ' OK';
                } else {
                    li.textContent += ' ' + res.status + ': ' + res.statusText;
                }

                requestDownloadExternalFile(linkGen);
            })
            .catch(function (res) {
                console.log('failure');
                console.log(res);
                requestDownloadExternalFile(linkGen);
            });
    }

    $form.submit(
        function (event) {
            event.preventDefault();
            const options = {
                call: 'plugin_fetchmedia_getExternalMediaLinks',
                namespace: $form.find('input[name="namespace"]').val(),
                type: $form.find('input[name="mediatypes"]:checked').val(),
                sectok: $form.find('input[name="sectok"]').val(),
            };
            jQuery.get(DOKU_BASE + 'lib/exe/ajax.php', options).done(function displayPagesToDownload(data) {
                const tableHead = '<table class="inline"><thead><tr><th>Page 📄</th><th>Links 🔗</th></tr></thead>';
                const tableRows = Object.entries(data).map(([page, mediaLinks]) =>
                    `<tr>
                        <td><span class="wikipage">${page}</span></td>
                        <td><ul>${mediaLinks.map(url => `<li data-id="${btoa(page + url)}">${url}</li>`).join('')}</ul></td>
                    </tr>`
                );
                // todo handle case that there are no external links
                const table = tableHead + tableRows.join('') + '</table>';
                jQuery('#fetchmedia_results').html(table);

                const linkGen = flattenLinks(data);
                requestDownloadExternalFile(linkGen);
            });
        },
    );
});
