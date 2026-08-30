// Hinihintay natin munang mag-load ang buong HTML bago tumakbo ang script na ito.
document.addEventListener('DOMContentLoaded', () => {

    // ============================================================
    // Collapsible sidebar (mobile hamburger menu)
    // ============================================================
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarContainer = document.getElementById('sidebarContainer');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    function toggleSidebar() {
        sidebarContainer.classList.toggle('open');
        sidebarOverlay.classList.toggle('open');
    }

    sidebarToggle.addEventListener('click', toggleSidebar);
    sidebarOverlay.addEventListener('click', toggleSidebar);

    // ============================================================
    // Mga sanggunian (references) na gagamitin sa buong script
    // ============================================================
    const tbody = document.querySelector('tbody');
    const addItemBtn = document.getElementById('addItemBtn');
    const totalAmountCell = document.getElementById('totalAmount');

    // Mga field na dapat lang tumanggap ng buong numbers (integers).
    const INTEGER_ONLY_FIELDS = ['qty', 'pulledOut', 'sold'];

    // Ang PRICE naman ay hiwalay nating tratuhin dahil pinapayagan
    // ito ng decimal point (hal. 49.50), hindi lang buong numero.
    const DECIMAL_FIELDS = ['price'];

    const STORAGE_KEY = 'hizonsInventoryTableData';

    // ============================================================
    // Paggawa ng bagong <tr> element (ginagamit ng Add Item AT ng
    // pag-load mula sa localStorage — kaya isang beses lang natin
    // isinulat ang "hugis" ng isang row, dito lang sa isang function)
    // ============================================================
    function buildRowElement(rowData) {
        const tr = document.createElement('tr');

        // Dagdag na "label" parameter — ito yung salitang lalabas
        // bago ang value kapag naka-card na ang view sa mobile.
        function createCell(field, text, editable, label) {
            const td = document.createElement('td');
            td.dataset.field = field;
            td.dataset.label = label;
            td.textContent = text;
            if (editable) td.setAttribute('contenteditable', 'true');
            return td;
        }

        tr.appendChild(createCell('items', rowData.items, true, 'Item'));
        tr.appendChild(createCell('qty', rowData.qty, true, 'Qty'));
        tr.appendChild(createCell('pulledOut', rowData.pulledOut, true, 'Pulled Out'));
        tr.appendChild(createCell('sold', rowData.sold, true, 'Sold'));
        tr.appendChild(createCell('price', rowData.price, true, 'Price'));

        // Ang AMOUNT ay hindi editable — kakalkulahin na lang natin
        // ito agad pagkatapos gawin ang row (tingnan sa ibaba).
        tr.appendChild(createCell('amount', '', false, 'Amount'));

        // Huling column: yung delete button. Hindi ito text field,
        // kaya hiwalay natin itong ginagawa (hindi gamit ang
        // createCell, dahil <button> ang laman nito, hindi text).
        const actionCell = document.createElement('td');
        actionCell.className = 'action-cell';

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-row-btn';
        deleteBtn.setAttribute('aria-label', 'Delete item');
        deleteBtn.innerHTML = '<i class="ri-delete-bin-line"></i>';

        actionCell.appendChild(deleteBtn);
        tr.appendChild(actionCell);

        return tr;
    }

    // ============================================================
    // Persistence gamit ang localStorage
    // ============================================================
    function saveTableData() {
        const rows = document.querySelectorAll('tbody tr');

        const data = Array.from(rows).map((row) => ({
            items: row.querySelector('[data-field="items"]').textContent,
            qty: row.querySelector('[data-field="qty"]').textContent,
            pulledOut: row.querySelector('[data-field="pulledOut"]').textContent,
            sold: row.querySelector('[data-field="sold"]').textContent,
            price: row.querySelector('[data-field="price"]').textContent
        }));

        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    function loadTableData() {
        const savedJson = localStorage.getItem(STORAGE_KEY);
        if (!savedJson) return false;

        const savedRows = JSON.parse(savedJson);

        tbody.innerHTML = '';
        savedRows.forEach((rowData) => {
            tbody.appendChild(buildRowElement(rowData));
        });

        return true;
    }

    loadTableData();

    // ============================================================
    // Pagkalkula ng AMOUNT bawat row, at ng TOTAL sa ibaba
    // ============================================================

    // Kumuha ng SOLD at PRICE (parehong nasa loob na ngayon ng
    // editable cells, hindi na naka-hidden sa data-price attribute),
    // i-mumultiply, tapos i-fo-format bilang piso.
    function recalculateAmount(row) {
        const soldCell = row.querySelector('[data-field="sold"]');
        const priceCell = row.querySelector('[data-field="price"]');
        const amountCell = row.querySelector('[data-field="amount"]');

        const sold = parseFloat(soldCell.textContent) || 0;
        const price = parseFloat(priceCell.textContent) || 0;

        const amount = sold * price;

        amountCell.textContent = amount.toLocaleString('en-PH', {
            style: 'currency',
            currency: 'PHP'
        });
    }

    // Kinukuha nito ang AMOUNT ng LAHAT ng rows (hindi galing sa
    // naka-display na text kundi muling kino-compute mula sa
    // SOLD x PRICE — mas maaasahan ito kaysa i-parse pabalik ang
    // "₱1,500.00" text), tapos ibinubuod bilang isang total.
    function updateTotal() {
        const rows = document.querySelectorAll('tbody tr');

        let total = 0;
        rows.forEach((row) => {
            const sold = parseFloat(row.querySelector('[data-field="sold"]').textContent) || 0;
            const price = parseFloat(row.querySelector('[data-field="price"]').textContent) || 0;
            total += sold * price;
        });

        totalAmountCell.textContent = total.toLocaleString('en-PH', {
            style: 'currency',
            currency: 'PHP'
        });
    }

    // ============================================================
    // Pag-type sa loob ng mga editable cells
    // ============================================================
    tbody.addEventListener('input', (event) => {
        const editedCell = event.target;
        if (!editedCell.matches('td[contenteditable="true"]')) return;

        const row = editedCell.closest('tr');
        recalculateAmount(row);

        // Kada may pagbabago, i-update din natin agad ang TOTAL sa
        // ibaba, hindi lang yung AMOUNT ng row na iyon.
        updateTotal();

        saveTableData();
    });

    // Pinipigilan natin ang mga hindi tamang keystroke (letters,
    // symbols) papasok sa mga numeric fields, BAGO pa sila
    // makapasok sa cell.
    tbody.addEventListener('keydown', (event) => {
        const cell = event.target;
        if (!cell.matches('td[contenteditable="true"]')) return;

        const field = cell.dataset.field;
        const isIntegerField = INTEGER_ONLY_FIELDS.includes(field);
        const isDecimalField = DECIMAL_FIELDS.includes(field);

        // Kung hindi naman ito isa sa mga field na dapat
        // pinipigilan, wala tayong gagawin — bahagi ito ng ITEMS
        // field kung saan pwede talagang mag-type ng kahit ano.
        if (!isIntegerField && !isDecimalField) return;

        const allowedKeys = [
            'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight',
            'ArrowUp', 'ArrowDown', 'Tab', 'Home', 'End'
        ];
        if (allowedKeys.includes(event.key)) return;
        if (event.ctrlKey || event.metaKey) return;

        const isDigit = /^[0-9]$/.test(event.key);

        // Para sa PRICE field, pinapayagan din natin ang "." pero
        // isang beses lang — kung mayroon nang tuldok sa kasalukuyang
        // text ng cell, hindi na natin papayagan ang isa pa.
        const isDecimalPoint = event.key === '.';
        const alreadyHasDecimalPoint = cell.textContent.includes('.');

        if (isDigit) return;
        if (isDecimalField && isDecimalPoint && !alreadyHasDecimalPoint) return;

        // Kung hindi natugunan ang kahit alin sa mga pinapayagan sa
        // itaas, i-block natin ang key na ito.
        event.preventDefault();
    });

    // Ganito rin ang ginagawa natin sa paste — pero dahil hindi
    // kayang i-detect ng 'keydown' ang paste, hiwalay nating
    // hinaharang ito dito.
    tbody.addEventListener('paste', (event) => {
        const cell = event.target;
        if (!cell.matches('td[contenteditable="true"]')) return;

        const field = cell.dataset.field;
        const isIntegerField = INTEGER_ONLY_FIELDS.includes(field);
        const isDecimalField = DECIMAL_FIELDS.includes(field);
        if (!isIntegerField && !isDecimalField) return;

        event.preventDefault();

        const pastedText = (event.clipboardData || window.clipboardData).getData('text');

        // Para sa integer fields, tanggalin lahat ng hindi digit.
        // Para sa PRICE (decimal field), pinapayagan din natin ang
        // isang "." sa resulta.
        const pattern = isDecimalField ? /[^0-9.]/g : /[^0-9]/g;
        const cleaned = pastedText.replace(pattern, '');

        document.execCommand('insertText', false, cleaned);
    });

    // ============================================================
    // Add Item button
    // ============================================================
    addItemBtn.addEventListener('click', () => {
        // Gumagawa tayo ng bagong blangkong row, na may default na
        // "New Item" bilang pangalan (para malinaw agad na bago ito),
        // at 0 sa lahat ng numeric fields.
        const newRow = buildRowElement({
            items: 'New Item',
            qty: '0',
            pulledOut: '0',
            sold: '0',
            price: '0'
        });

        tbody.appendChild(newRow);
        recalculateAmount(newRow);
        updateTotal();
        saveTableData();

        // Maliit na "quality of life" touch: awtomatiko nating
        // ino-open ang ITEMS cell ng bagong row para direkta nang
        // makapag-type ang user ng tunay na pangalan, hindi na
        // niya kailangang mag-scroll o mag-click pa nang malayo.
        const itemsCell = newRow.querySelector('[data-field="items"]');
        itemsCell.focus();

        // Ito ang paraan para "ma-select" (ma-highlight) ang buong
        // text sa loob ng cell, kaya sa unang pagta-type pa lang ng
        // user, agad na mapapalitan ang "New Item" placeholder.
        const range = document.createRange();
        range.selectNodeContents(itemsCell);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    });

    // ============================================================
    // Delete row button (event delegation din, tulad ng iba)
    // ============================================================
    tbody.addEventListener('click', (event) => {
        // .closest() ay hahanapin nito yung pinakamalapit na
        // ancestor (o ang sarili nito) na tumutugma sa
        // '.delete-row-btn' — kaya kahit ang <i> icon sa loob ng
        // button ang na-click (hindi mismo ang <button>), gagana
        // pa rin ito.
        const deleteBtn = event.target.closest('.delete-row-btn');
        if (!deleteBtn) return;

        const row = deleteBtn.closest('tr');
        const itemName = row.querySelector('[data-field="items"]').textContent;

        // Simpleng confirmation dialog bago talaga tanggalin —
        // proteksyon laban sa aksidenteng pag-click.
        const confirmed = confirm('Sigurado ka bang gusto mong tanggalin ang "' + itemName + '"?');
        if (!confirmed) return;

        row.remove();
        updateTotal();
        saveTableData();
    });

    // ============================================================
    // Paunang pag-compute pagkatapos ma-load ang page
    // ============================================================
    document.querySelectorAll('tbody tr').forEach(recalculateAmount);
    updateTotal();

    if (!localStorage.getItem(STORAGE_KEY)) {
        saveTableData();
    }
});