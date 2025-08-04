$(document).ready(function() {
    let selectedCountry = null;
    let countriesData = null;
    let zoomBehavior = null;
    let svg = null;
    let mapGroup = null;
    let availableCountries = [];

    // Load countries data from JSON file
    async function loadCountriesData() {
        try {
            const response = await fetch('data/countries_data.json');
            countriesData = await response.json();
            console.log('Countries data loaded successfully');
        } catch (error) {
            console.error('Error loading countries data:', error);
        }
    }

    // Initialize zoom functionality
    function initializeZoom() {
        svg = d3.select('#svg-map');
        
        // Create a group element to contain all map elements
        mapGroup = svg.append('g').attr('class', 'map-group');
        
        // Define zoom behavior
        zoomBehavior = d3.zoom()
            .scaleExtent([0.5, 8]) // Min zoom: 0.5x, Max zoom: 8x
            .on('zoom', function(event) {
                mapGroup.attr('transform', event.transform);
            });
        
        // Apply zoom behavior to SVG
        svg.call(zoomBehavior);
        
        // Add zoom controls
        addZoomControls();
    }

    // Add zoom control buttons
    function addZoomControls() {
        const mapContainer = document.querySelector('.map-container');
        
        const zoomControls = document.createElement('div');
        zoomControls.className = 'zoom-controls';
        zoomControls.innerHTML = `
            <button id="zoom-in" class="zoom-btn" title="Zoom In">+</button>
            <button id="zoom-out" class="zoom-btn" title="Zoom Out">−</button>
            <button id="zoom-reset" class="zoom-btn" title="Reset Zoom">⌂</button>
        `;
        
        mapContainer.appendChild(zoomControls);
        
        // Add event listeners for zoom controls
        document.getElementById('zoom-in').addEventListener('click', zoomIn);
        document.getElementById('zoom-out').addEventListener('click', zoomOut);
        document.getElementById('zoom-reset').addEventListener('click', resetZoom);
    }

    // Zoom control functions
    function zoomIn() {
        svg.transition().duration(300).call(
            zoomBehavior.scaleBy, 1.5
        );
    }

    function zoomOut() {
        svg.transition().duration(300).call(
            zoomBehavior.scaleBy, 1 / 1.5
        );
    }

    function resetZoom() {
        svg.transition().duration(500).call(
            zoomBehavior.transform,
            d3.zoomIdentity
        );
    }

    // Initialize SVG map
    async function initSVGMap() {
        try {
            const response = await fetch('assets/world.svg');
            const svgText = await response.text();
            
            // Parse the SVG content
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
            
            // Get the SVG element from the parsed document
            const svgElement = svgDoc.querySelector('svg');
            if (svgElement) {
                // Initialize zoom first
                initializeZoom();
                
                // Get all path elements that have either id or class attributes
                const paths = svgElement.querySelectorAll('path[id], path[class]');
                
                // Add them to our map group instead of directly to SVG
                paths.forEach(path => {
                    mapGroup.node().appendChild(path.cloneNode(true));
                });
                
                // Now setup interactivity
                setupSVGInteractivity();
                console.log('SVG map loaded and interactive with zoom');
            }
        } catch (error) {
            console.error('Error loading SVG map:', error);
        }
    }

    // Get country identifier (id or class)
    function getCountryIdentifier(path) {
        return path.getAttribute('id') || path.getAttribute('class');
    }

    // Get country name from various possible attributes
    function getCountryName(path) {
        const name = path.getAttribute('name') || 
                    path.getAttribute('title') || 
                    path.getAttribute('data-name') ||
                    path.getAttribute('id') ||
                    path.getAttribute('class');
        
        // Clean up common naming inconsistencies
        if (name) {
            return name.replace(/[-_]/g, ' ').trim();
        }
        return name;
    }

    // Normalize country name for better matching
    function normalizeCountryName(name) {
        if (!name) return '';
        return name.toLowerCase()
                  .replace(/[-_]/g, ' ')
                  .replace(/\s+/g, ' ')
                  .trim();
    }

    // Check if two country names match (handles variations)
    function countriesMatch(name1, name2) {
        if (!name1 || !name2) return false;
        
        const norm1 = normalizeCountryName(name1);
        const norm2 = normalizeCountryName(name2);
        
        return norm1 === norm2 ||
               norm1.includes(norm2) ||
               norm2.includes(norm1) ||
               // Handle common country name variations
               (norm1.includes('china') && norm2.includes('china')) ||
               (norm1.includes('united states') && norm2.includes('usa')) ||
               (norm1.includes('usa') && norm2.includes('united states')) ||
               (norm1.includes('united kingdom') && norm2.includes('uk')) ||
               (norm1.includes('uk') && norm2.includes('united kingdom'));
    }

    // Initialize search suggestions functionality
    function initializeSearchSuggestions() {
        const searchInput = $('#country-search');
        const searchContainer = searchInput.parent();
        
        // Create suggestions dropdown
        const suggestionsDropdown = $(`
            <div id="search-suggestions" class="search-suggestions">
                <!-- Suggestions will be populated here -->
            </div>
        `);
        
        searchContainer.append(suggestionsDropdown);
        
        // Handle input for suggestions
        searchInput.on('input', function() {
            const searchTerm = $(this).val().toLowerCase().trim();
            showSearchSuggestions(searchTerm);
            highlightSearchMatches(searchTerm);
        });
        
        // Handle focus to show suggestions
        searchInput.on('focus', function() {
            const searchTerm = $(this).val().toLowerCase().trim();
            if (searchTerm.length > 0) {
                showSearchSuggestions(searchTerm);
            }
        });
        
        // Hide suggestions when clicking outside
        $(document).on('click', function(e) {
            if (!$(e.target).closest('.search-container, #search-suggestions').length) {
                hideSuggestions();
            }
        });
        
        // Handle keyboard navigation
        searchInput.on('keydown', function(e) {
            const suggestions = $('#search-suggestions .suggestion-item');
            const activeSuggestion = $('#search-suggestions .suggestion-item.active');
            
            switch(e.which) {
                case 38: // Up arrow
                    e.preventDefault();
                    if (activeSuggestion.length) {
                        const prev = activeSuggestion.prev('.suggestion-item');
                        activeSuggestion.removeClass('active');
                        if (prev.length) {
                            prev.addClass('active');
                        } else {
                            suggestions.last().addClass('active');
                        }
                    } else if (suggestions.length) {
                        suggestions.last().addClass('active');
                    }
                    break;
                    
                case 40: // Down arrow
                    e.preventDefault();
                    if (activeSuggestion.length) {
                        const next = activeSuggestion.next('.suggestion-item');
                        activeSuggestion.removeClass('active');
                        if (next.length) {
                            next.addClass('active');
                        } else {
                            suggestions.first().addClass('active');
                        }
                    } else if (suggestions.length) {
                        suggestions.first().addClass('active');
                    }
                    break;
                    
                case 13: // Enter
                    e.preventDefault();
                    if (activeSuggestion.length) {
                        activeSuggestion.click();
                    } else {
                        handleSearchEnter();
                    }
                    break;
                    
                case 27: // Escape
                    hideSuggestions();
                    break;
            }
        });
    }
    
    // Show search suggestions
    function showSearchSuggestions(searchTerm) {
        const suggestionsContainer = $('#search-suggestions');
        
        if (searchTerm.length === 0) {
            hideSuggestions();
            return;
        }
        
        // Filter countries based on search term
        const matchingCountries = availableCountries.filter(country => 
            country.normalizedName.includes(searchTerm) ||
            country.name.toLowerCase().includes(searchTerm)
        ).slice(0, 8); // Limit to 8 suggestions
        
        if (matchingCountries.length === 0) {
            hideSuggestions();
            return;
        }
        
        // Build suggestions HTML
        const suggestionsHTML = matchingCountries.map(country => `
            <div class="suggestion-item" data-country-name="${country.name}" data-country-id="${country.id}">
                <span class="country-name">${country.name}</span>
            </div>
        `).join('');
        
        suggestionsContainer.html(suggestionsHTML).show();
        
        // Add click handlers to suggestions
        suggestionsContainer.find('.suggestion-item').on('click', function() {
            const countryName = $(this).data('country-name');
            const countryId = $(this).data('country-id');
            
            // Update search input
            $('#country-search').val(countryName);
            
            // Select the country
            selectCountry(countryName, countryId);
            highlightCountry(countryId);
            
            // Hide suggestions
            hideSuggestions();
        });
        
        // Add hover effects
        suggestionsContainer.find('.suggestion-item').on('mouseenter', function() {
            suggestionsContainer.find('.suggestion-item').removeClass('active');
            $(this).addClass('active');
        });
    }
    
    // Hide suggestions
    function hideSuggestions() {
        $('#search-suggestions').hide();
    }
    
    // Highlight search matches on map
    function highlightSearchMatches(searchTerm) {
        if (searchTerm.length > 0 && mapGroup) {
            // Reset all countries to default color
            mapGroup.selectAll('path[id], path[class]')
                .style('fill', '#D9D9D9');
            
            // Highlight matching countries
            mapGroup.selectAll('path[id], path[class]').each(function() {
                const countryName = getCountryName(this);
                if (countryName && normalizeCountryName(countryName).includes(searchTerm)) {
                    d3.select(this).style('fill', '#B8B8B8');
                }
            });
        } else if (mapGroup) {
            // Reset all countries to default color
            mapGroup.selectAll('path[id], path[class]')
                .style('fill', '#D9D9D9');
            
            // Restore selected country highlight if any
            if (selectedCountry) {
                highlightCountry(selectedCountry.code);
            }
        }
    }
    
    // Handle Enter key in search
    function handleSearchEnter() {
        const searchTerm = $('#country-search').val().toLowerCase().trim();
        if (!mapGroup || searchTerm.length === 0) return;
        
        // Find exact match first
        let found = false;
        mapGroup.selectAll('path[id], path[class]').each(function() {
            if (found) return;
            
            const countryName = getCountryName(this);
            if (countryName && normalizeCountryName(countryName) === searchTerm) {
                const countryId = getCountryIdentifier(this);
                selectCountry(countryName, countryId);
                highlightCountry(countryId);
                hideSuggestions();
                found = true;
            }
        });
        
        // If no exact match, try partial match
        if (!found) {
            mapGroup.selectAll('path[id], path[class]').each(function() {
                if (found) return;
                
                const countryName = getCountryName(this);
                if (countryName && normalizeCountryName(countryName).includes(searchTerm)) {
                    const countryId = getCountryIdentifier(this);
                    selectCountry(countryName, countryId);
                    highlightCountry(countryId);
                    hideSuggestions();
                    found = true;
                }
            });
        }
    }

    // Setup SVG interactivity
    function setupSVGInteractivity() {
        if (!mapGroup) return;

        // Get all country paths (with either id or class) from the map group
        const paths = mapGroup.selectAll('path[id], path[class]');
        
        // Build list of available countries for search suggestions
        availableCountries = [];
        
        paths.each(function() {
            const path = this;
            const countryId = getCountryIdentifier(path);
            const countryName = getCountryName(path);
            
            if (countryId && countryName) {
                // Add to available countries list (avoid duplicates)
                const normalizedName = normalizeCountryName(countryName);
                if (!availableCountries.some(c => normalizeCountryName(c.name) === normalizedName)) {
                    availableCountries.push({
                        name: countryName,
                        id: countryId,
                        normalizedName: normalizedName
                    });
                }
                
                // Set initial styles
                d3.select(path)
                    .style('fill', '#D9D9D9')
                    .style('stroke', '#0D0D0D')
                    .style('stroke-width', '0.5')
                    .style('cursor', 'pointer')
                    .style('transition', 'fill 0.3s ease');
                
                // Add click event
                d3.select(path).on('click', function(event) {
                    // Stop event propagation to prevent zoom behavior
                    event.stopPropagation();
                    selectCountry(countryName, countryId);
                    highlightCountry(countryId);
                });
                
                // Add hover effects
                d3.select(path)
                    .on('mouseenter', function() {
                        if (d3.select(this).style('fill') !== 'rgb(95, 17, 17)') { // #5F1111 in RGB
                            d3.select(this).style('fill', '#B8B8B8');
                        }
                    })
                    .on('mouseleave', function() {
                        if (d3.select(this).style('fill') !== 'rgb(95, 17, 17)') { // #5F1111 in RGB
                            d3.select(this).style('fill', '#D9D9D9');
                        }
                    });
            } else {
                // Even if no name/id, still style it to prevent visual inconsistencies
                d3.select(path)
                    .style('fill', '#D9D9D9')
                    .style('stroke', '#0D0D0D')
                    .style('stroke-width', '0.5');
            }
        });
        
        // Sort countries alphabetically for better UX
        availableCountries.sort((a, b) => a.name.localeCompare(b.name));
        
        // Initialize search suggestions
        initializeSearchSuggestions();
    }

    // Highlight selected country
    function highlightCountry(countryId) {
        if (!mapGroup) return;
        
        // Reset all countries to default color
        mapGroup.selectAll('path[id], path[class]')
            .style('fill', '#D9D9D9');
        
        // Try multiple approaches to find and highlight the country
        let highlightedPaths = 0;
        
        // 1. Exact match by ID
        mapGroup.selectAll(`path[id="${countryId}"]`).each(function() {
            d3.select(this).style('fill', '#5F1111');
            highlightedPaths++;
        });
        
        // 2. Exact match by class
        if (highlightedPaths === 0) {
            mapGroup.selectAll(`path[class="${countryId}"]`).each(function() {
                d3.select(this).style('fill', '#5F1111');
                highlightedPaths++;
            });
        }
        
        // 3. Partial match (for countries with multiple regions)
        if (highlightedPaths === 0) {
            mapGroup.selectAll('path[id], path[class]').each(function() {
                const pathId = getCountryIdentifier(this);
                const pathName = getCountryName(this);
                
                // Check if the path belongs to the same country
                if (pathId && (
                    pathId.toLowerCase().includes(countryId.toLowerCase()) ||
                    countryId.toLowerCase().includes(pathId.toLowerCase()) ||
                    (pathName && pathName.toLowerCase().includes(selectedCountry?.name?.toLowerCase())) ||
                    (selectedCountry?.name && pathName && selectedCountry.name.toLowerCase().includes(pathName.toLowerCase()))
                )) {
                    d3.select(this).style('fill', '#5F1111');
                    highlightedPaths++;
                }
            });
        }
        
        // 4. Country name-based matching (fallback)
        if (highlightedPaths === 0 && selectedCountry?.name) {
            const countryName = selectedCountry.name.toLowerCase();
            mapGroup.selectAll('path[id], path[class]').each(function() {
                const pathName = getCountryName(this);
                if (pathName && (
                    pathName.toLowerCase() === countryName ||
                    pathName.toLowerCase().includes(countryName) ||
                    countryName.includes(pathName.toLowerCase())
                )) {
                    d3.select(this).style('fill', '#5F1111');
                    highlightedPaths++;
                }
            });
        }
        
        console.log(`Highlighted ${highlightedPaths} path(s) for ${selectedCountry?.name || countryId}`);
    }

    // Zoom to country function
    function zoomToCountry(countryId) {
        if (!mapGroup || !svg) return;
        
        // Collect all paths that belong to this country
        const countryPaths = [];
        
        // Try different matching strategies
        mapGroup.selectAll('path[id], path[class]').each(function() {
            const pathId = getCountryIdentifier(this);
            const pathName = getCountryName(this);
            
            if (pathId && (
                pathId === countryId ||
                pathId.toLowerCase().includes(countryId.toLowerCase()) ||
                countryId.toLowerCase().includes(pathId.toLowerCase()) ||
                (selectedCountry?.name && pathName && 
                 (pathName.toLowerCase().includes(selectedCountry.name.toLowerCase()) ||
                  selectedCountry.name.toLowerCase().includes(pathName.toLowerCase())))
            )) {
                countryPaths.push(this);
            }
        });
        
        if (countryPaths.length > 0) {
            try {
                // Calculate combined bounding box for all country paths
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                
                countryPaths.forEach(path => {
                    const bounds = path.getBBox();
                    minX = Math.min(minX, bounds.x);
                    minY = Math.min(minY, bounds.y);
                    maxX = Math.max(maxX, bounds.x + bounds.width);
                    maxY = Math.max(maxY, bounds.y + bounds.height);
                });
                
                const dx = maxX - minX;
                const dy = maxY - minY;
                const x = minX + dx / 2;
                const y = minY + dy / 2;
                const scale = Math.min(8, 0.9 / Math.max(dx / 2000, dy / 857));
                const translate = [2000 / 2 - scale * x, 857 / 2 - scale * y];
                
                svg.transition()
                    .duration(750)
                    .call(zoomBehavior.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
            } catch (error) {
                console.error('Error zooming to country:', error);
            }
        } else {
            console.warn(`No paths found for country: ${selectedCountry?.name || countryId}`);
        }
    }

    // Handle country selection
    function selectCountry(countryName, countryCode) {
        selectedCountry = {
            name: countryName,
            code: countryCode
        };

        // Update country info display
        $('#selected-country-name').text(countryName);
        $('#country-name-display').text(countryName);
        
        // Show country info and song section
        $('#country-info').show();
        $('#song-section').show();

        // Load and display songs for the selected country
        loadCountrySongs(countryName);

        // Reset song buttons to first song
        $('.song-btn').removeClass('active');
        $('.song-btn[data-song="1"]').addClass('active');
        $('.song-item').removeClass('active');
        $('#song-1').addClass('active');

        // Zoom to the selected country (optional)
        setTimeout(() => {
            zoomToCountry(countryCode);
        }, 100);

        // Scroll to song section
        setTimeout(() => {
            $('#song-section')[0].scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
        }, 800); // Wait for zoom to complete
    }

    // Load songs for selected country
    function loadCountrySongs(countryName) {
        if (!countriesData || !countriesData.countries) return;
        
        const country = countriesData.countries.find(c => c.name === countryName);
        if (country && country.top_songs) {
            // Update song content for each song
            country.top_songs.forEach((song, index) => {
                const songNumber = index + 1;
                const songItem = $(`#song-${songNumber}`);
                
                if (songItem.length) {
                    // Update video iframe
                    const iframe = songItem.find('iframe');
                    if (iframe.length && song.url) {
                        iframe.attr('src', song.url);
                    }
                    
                    // Update song title
                    const songTitle = songItem.find('.song-info h3');
                    if (songTitle.length) {
                        songTitle.text(song.title);
                    }
                }
            });
        }
    }

    // Handle song button clicks
    $('.song-btn').on('click', function() {
        const songNumber = $(this).data('song');
        
        // Update button states
        $('.song-btn').removeClass('active');
        $(this).addClass('active');
        
        // Update song content
        $('.song-item').removeClass('active');
        $(`#song-${songNumber}`).addClass('active');
    });

    // Handle search functionality (simplified since suggestions handle most of this)
    $('#country-search').on('input', function() {
        // This is now handled by the suggestions system
        // but we keep it for backward compatibility
    });

    // Handle search on Enter key
    $('#country-search').on('keypress', function(e) {
        if (e.which === 13) { // Enter key
            handleSearchEnter();
        }
    });

    // Initialize everything
    loadCountriesData();
    initSVGMap();

    // Add mobile menu functionality (same as home page)
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    const closeMenu = document.querySelector('.close-menu');

    if (hamburger) {
        hamburger.addEventListener('click', function() {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
    }

    if (closeMenu) {
        closeMenu.addEventListener('click', function() {
            hamburger.classList.remove('active');
            navLinks.classList.remove('active');
        });
    }

    if (navLinks) {
        navLinks.addEventListener('click', function(e) {
            if (e.target.tagName === 'A') {
                hamburger.classList.remove('active');
                navLinks.classList.remove('active');
            }
        });
    }
});