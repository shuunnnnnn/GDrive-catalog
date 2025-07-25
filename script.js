$(document).ready(function() {
    const jsonFile = 'google_drive_catalog_fin.json'; 

    const ITEMS_PER_PAGE = 20; 
    const BATCH_RENDER_SIZE = 100; 
    const BATCH_RENDER_DELAY_MS = 50; 

    let allCatalogData = []; 
    let filteredData = [];   
    let currentPage = 1;     
    let totalPages = 1;      

    const $catalogContainer = $('#catalogContainer');
    const $loadingIndicator = $('#loadingIndicator');
    const $searchBar = $('#searchBar');
    const $mimeTypeFilter = $('#mimeTypeFilter');
    const $tagFilter = $('#tagFilter');
    const $resetFiltersButton = $('#resetFiltersButton');
    const $prevPageButton = $('#prevPageButton');
    const $nextPageButton = $('#nextPageButton');
    const $pageNumbersContainer = $('#pageNumbersContainer');

    function formatBytes(bytes) {
        if (bytes === 'N/A' || bytes === undefined || bytes === null || isNaN(bytes)) return 'N/A';
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 Bytes';
        const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
    }

    function buildItemCard(item) {
        const fileName = String(item['File Name'] || 'Untitled'); 
        const fileId = String(item['File ID'] || '');
        const mimeType = String(item['MIME Type'] || 'N/A');
        const location = String(item['Location on Catalog'] || 'N/A');
        const tags = String(item['Tags'] || '');
        const size = String(item['Size (bytes)'] || 0); // Ensure size is a string for safety in template
        const lastModified = String(item['Last Modified'] || '');
        const downloadLink = String(item['Download Link (Generic)'] || '#');

        const tagsHtml = tags && tags.trim() 
                         ? tags.split(',').map(tag => tag.trim() ? `<span>${tag.trim()}</span>` : '').join('') 
                         : '<em>No Tags</em>';

        return `
            <div class="catalog-item">
                <div class="item-header">
                    <h3>${fileName}</h3>
                </div>
                <div class="item-body">
                    <p><strong>Type:</strong> ${mimeType}</p>
                    <p><strong>Size:</strong> ${formatBytes(size)}</p>
                    <p><strong>Modified:</strong> ${lastModified ? new Date(lastModified).toLocaleDateString() : 'N/A'}</p>
                    <p><strong>Location:</strong> ${location}</p>
                    <p class="item-tags">${tagsHtml}</p>
                    <p><a href="${downloadLink}" target="_blank">Download File</a></p>
                </div>
            </div>
        `;
    }

    function renderCatalogPage(dataToDisplay) {
        $catalogContainer.empty(); 
        console.log("DEBUG: renderCatalogPage called. Items to display:", dataToDisplay.length); // ADDED LOG

        if (dataToDisplay.length === 0) {
            $catalogContainer.html('<div class="no-results">No results found matching your criteria.</div>');
            console.log("DEBUG: No items to display, showing 'No results' message."); // ADDED LOG
            return;
        }

        let pageHtmlContent = '';
        dataToDisplay.forEach(item => {
            pageHtmlContent += buildItemCard(item);
        });
        
        console.log("DEBUG: Final pageHtmlContent length before append:", pageHtmlContent.length); // ADDED LOG
        // console.log("DEBUG: Final pageHtmlContent snippet:", pageHtmlContent.substring(0, 500) + "..."); // Uncomment for larger snippet

        $catalogContainer.html(pageHtmlContent);

        console.log("DEBUG: Items successfully appended to DOM. Count:", $catalogContainer.find('.catalog-item').length); // ADDED LOG
    }

    function updatePaginationControls() {
        totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);

        $prevPageButton.prop('disabled', currentPage === 1);
        $nextPageButton.prop('disabled', currentPage === totalPages || totalPages === 0);

        $pageNumbersContainer.empty(); 

        const maxPageButtons = 7; 
        let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
        let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);

        if (endPage - startPage + 1 < maxPageButtons) {
            startPage = Math.max(1, endPage - maxPageButtons + 1);
        }

        if (startPage > 1) {
            $pageNumbersContainer.append($('<button>1</button>').on('click', () => goToPage(1)));
            if (startPage > 2) $pageNumbersContainer.append($('<span>...</span>'));
        }

        for (let i = startPage; i <= endPage; i++) {
            const $button = $('<button>').text(i).on('click', () => goToPage(i));
            if (i === currentPage) {
                $button.addClass('active-page');
            }
            $pageNumbersContainer.append($button);
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) $pageNumbersContainer.append($('<span>...</span>'));
            $pageNumbersContainer.append($(`<button>${totalPages}</button>`).on('click', () => goToPage(totalPages)));
        }
    }

    function goToPage(pageNumber) {
        console.log("DEBUG: Entered goToPage. Attempting to go to page:", pageNumber); // ADDED LOG

        // CRITICAL CHECK: totalPages might be 0 if filteredData is empty.
        // Also, check if pageNumber is valid.
        if (totalPages === 0 || pageNumber < 1 || pageNumber > totalPages) {
            console.log("DEBUG: goToPage: Invalid page number or no total pages. Current page:", currentPage, "Total pages:", totalPages); // ADDED LOG
            renderCatalogPage([]); // Render empty if no valid page
            updatePaginationControls();
            return; 
        }
        
        currentPage = pageNumber;
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const pageItems = filteredData.slice(startIndex, endIndex);
        
        console.log(`DEBUG: goToPage: Slicing data from index ${startIndex} to ${endIndex}. Items in slice: ${pageItems.length}`); // ADDED LOG

        renderCatalogPage(pageItems);
        updatePaginationControls();
    }

    function applyFiltersAndSearch() {
        const searchTerm = $searchBar.val().toLowerCase();
        const mimeTypeFilterValue = $mimeTypeFilter.val(); 
        const tagFilterValue = $tagFilter.val(); 

        console.log("--- APPLYING FILTERS ---");
        console.log(`DEBUG: allCatalogData.length (before filter): ${allCatalogData.length}`);
        console.log(`DEBUG: Filter values: Search="${searchTerm}", MIME="${mimeTypeFilterValue}", Tag="${tagFilterValue}"`);

        filteredData = allCatalogData.filter(item => {
            const fileName = String(item['File Name'] || '');
            const fileId = String(item['File ID'] || '');
            const location = String(item['Location on Catalog'] || '');
            const mimeType = String(item['MIME Type'] || '');
            const tags = String(item['Tags'] || ''); 

            const searchableText = `${fileName} ${fileId} ${location} ${tags} ${mimeType}`.toLowerCase();
            
            let passedSearch = true;
            let passedMimeType = true;
            let passedTag = true;

            if (searchTerm.length > 0) { 
                passedSearch = searchableText.includes(searchTerm);
            }

            if (mimeTypeFilterValue !== 'all') {
                const itemMimeTypeSanitized = mimeType.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
                const selectedMimeTypeSanitized = mimeTypeFilterValue.replace('.', ''); 
                
                passedMimeType = (itemMimeTypeSanitized === selectedMimeTypeSanitized); 
            }

            if (tagFilterValue !== 'all') {
                const itemTagsArray = tags.toLowerCase().split(',').map(t => t.trim()).filter(Boolean); 
                const selectedTagSanitized = tagFilterValue.replace('.', ''); 
                
                passedTag = itemTagsArray.includes(selectedTagSanitized);
            }
            
            return passedSearch && passedMimeType && passedTag;
        });

        console.log(`DEBUG: Filter result: ${filteredData.length} items found.`);
        console.log("DEBUG: Calling goToPage(1) from applyFiltersAndSearch."); // ADDED LOG
        currentPage = 1; 
        goToPage(1); 
        console.log("--- FILTERS APPLIED ---");
    }

    // --- Event Listeners ---
    $searchBar.on('keyup', applyFiltersAndSearch);
    $mimeTypeFilter.on('change', applyFiltersAndSearch);
    $tagFilter.on('change', applyFiltersAndSearch);
    $resetFiltersButton.on('click', function() {
        $searchBar.val('');
        $mimeTypeFilter.val('all'); 
        $tagFilter.val('all');     
        console.log("DEBUG: Reset button clicked. Input values set to default.");
        applyFiltersAndSearch();   
        console.log("Filters reset.");
    });

    $prevPageButton.on('click', () => goToPage(currentPage - 1));
    $nextPageButton.on('click', () => goToPage(currentPage + 1));
    $pageNumbersContainer.on('click', 'button', function() {
        const pageNum = parseInt($(this).text());
        if (!isNaN(pageNum)) {
            goToPage(pageNum);
        }
    });

    // --- Initialization ---
    $loadingIndicator.show();
    $catalogContainer.hide(); 

    $.getJSON(jsonFile, function(data) {
        console.log("1. JSON data loaded. Number of items:", data.length);
        allCatalogData = data; 

        // Populate filter dropdowns from all unique values in allCatalogData
        let allMimeTypes = new Set();
        let allTags = new Set();
        allCatalogData.forEach(item => {
            if (item['MIME Type']) allMimeTypes.add(item['MIME Type']);
            if (item['Tags']) { 
                item['Tags'].split(',').forEach(tag => {
                    const trimmedTag = tag.trim();
                    if (trimmedTag) allTags.add(trimmedTag);
                });
            }
        });

        Array.from(allMimeTypes).sort().forEach(type => {
            $mimeTypeFilter.append(`<option value=".${type.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}">${type}</option>`);
        });
        Array.from(allTags).sort().forEach(tag => {
            const sanitizedTag = tag.replace(/\s/g, '-').toLowerCase(); 
            $tagFilter.append(`<option value=".${sanitizedTag}">${tag}</option>`);
        });

        // Initial render: Apply all filters (which will be none initially) and show first page
        applyFiltersAndSearch(); 

        $loadingIndicator.hide();
        $catalogContainer.show();
        console.log("Catalog ready.");

    })
    .fail(function(jqxhr, textStatus, error) {
        var err = textStatus + ", " + error;
        console.error( "Request Failed: " + err );
        alert("Error loading data: " + err + ". Make sure 'google_drive_catalog_fin.json' exists in the same folder and is valid JSON.");
        $loadingIndicator.hide(); 
    });
});
