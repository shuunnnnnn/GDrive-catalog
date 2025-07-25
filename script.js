$(document).ready(function() {
    // Define the paths to your JSON files
    const jsonFiles = [
        'local_catalog_for_web_interface_elibs.json', // Replace with your actual file names
        'local_catalog_for_web_interface_perpus.json',
        'local_catalog_for_web_interface_dihmaksa.json'
        // Add more files if needed
    ];

    // Create an array of promises, one for each JSON file fetch
    const fetchPromises = jsonFiles.map(function(file) {
        return $.getJSON(file);
    });

    // Use Promise.all to wait for all fetches to complete
    Promise.all(fetchPromises)
        .then(function(results) {
            let combinedData = [];
            // Concatenate data from all successful fetches
            results.forEach(function(data) {
                if (Array.isArray(data)) { // Ensure the fetched data is an array
                    combinedData = combinedData.concat(data);
                } else {
                    console.warn("Fetched data is not an array:", data);
                }
            });

            // Initialize DataTables with the combined data
            $('#catalogTable').DataTable({
                data: combinedData, // Use the combined data here
                columns: [
                    { data: 'File Name' },
                    { data: 'MIME Type' },
                    { 
                        data: 'Size (bytes)',
                        render: function(data, type, row) {
                            if (type === 'display' || type === 'filter') {
                                if (data === 'N/A') return 'N/A';
                                const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
                                const i = parseInt(Math.floor(Math.log(data) / Math.log(1024)));
                                return Math.round(data / Math.pow(1024, i), 2) + ' ' + sizes[i];
                            }
                            return data;
                        }
                    },
                    { data: 'Last Modified' },
                    { data: 'Location on Catalog' },
                    { data: 'Tags' },
                    { 
                        data: 'Download Link (Generic)',
                        render: function(data, type, row) {
                            if (type === 'display') {
                                return '<a href="' + data + '" target="_blank">Download</a>';
                            }
                            return data;
                        },
                        orderable: false
                    }
                ],
                paging: true,
                searching: true,
                ordering: true,
                info: true,
                lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "All"]]
            });
        })
        .catch(function(error) {
            // This runs if any of the JSON files fail to load
            console.error("Error loading one or more JSON files:", error);
            alert("Error loading data. Make sure all JSON files exist and are valid. Check console for details.");
        });
});