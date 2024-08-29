let map;
let service;
let infowindow;
const searchButton = document.getElementById('search-button');
const searchInput = document.getElementById('search-input');
const resultsContainer = document.getElementById('results-container');

function initMap() {
    const defaultLocation = { lat: 37.7749, lng: -122.4194 }; // San Francisco
    const darkMapStyle = [
        {elementType: 'geometry', stylers: [{color: '#242f3e'}]},
        {elementType: 'labels.text.stroke', stylers: [{color: '#242f3e'}]},
        {elementType: 'labels.text.fill', stylers: [{color: '#746855'}]},
        {
            featureType: 'administrative.locality',
            elementType: 'labels.text.fill',
            stylers: [{color: '#d59563'}]
        },
        {
            featureType: 'poi',
            elementType: 'labels.text.fill',
            stylers: [{color: '#d59563'}]
        },
        {
            featureType: 'poi.park',
            elementType: 'geometry',
            stylers: [{color: '#263c3f'}]
        },
        {
            featureType: 'poi.park',
            elementType: 'labels.text.fill',
            stylers: [{color: '#6b9a76'}]
        },
        {
            featureType: 'road',
            elementType: 'geometry',
            stylers: [{color: '#38414e'}]
        },
        {
            featureType: 'road',
            elementType: 'geometry.stroke',
            stylers: [{color: '#212a37'}]
        },
        {
            featureType: 'road',
            elementType: 'labels.text.fill',
            stylers: [{color: '#9ca5b3'}]
        },
        {
            featureType: 'road.highway',
            elementType: 'geometry',
            stylers: [{color: '#746855'}]
        },
        {
            featureType: 'road.highway',
            elementType: 'geometry.stroke',
            stylers: [{color: '#1f2835'}]
        },
        {
            featureType: 'road.highway',
            elementType: 'labels.text.fill',
            stylers: [{color: '#f3d19c'}]
        },
        {
            featureType: 'transit',
            elementType: 'geometry',
            stylers: [{color: '#2f3948'}]
        },
        {
            featureType: 'transit.station',
            elementType: 'labels.text.fill',
            stylers: [{color: '#d59563'}]
        },
        {
            featureType: 'water',
            elementType: 'geometry',
            stylers: [{color: '#17263c'}]
        },
        {
            featureType: 'water',
            elementType: 'labels.text.fill',
            stylers: [{color: '#515c6d'}]
        },
        {
            featureType: 'water',
            elementType: 'labels.text.stroke',
            stylers: [{color: '#17263c'}]
        }
    ];

    map = new google.maps.Map(document.getElementById('map'), {
        center: defaultLocation,
        zoom: 13,
        styles: darkMapStyle
    });

    service = new google.maps.places.PlacesService(map);
    infowindow = new google.maps.InfoWindow();
}

searchButton.addEventListener('click', performSearch);

function performSearch() {
    const query = searchInput.value;
    if (!query) return;

    resultsContainer.innerHTML = '<p>Searching...</p>';

    const request = {
        query: query,
        fields: ['name', 'geometry', 'formatted_address', 'rating', 'user_ratings_total', 'place_id']
    };

    service.textSearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            displayResults(results, query);
        } else {
            resultsContainer.innerHTML = '<p>No results found or an error occurred.</p>';
        }
    });
}

function displayResults(results, query) {
    resultsContainer.innerHTML = '';
    const bounds = new google.maps.LatLngBounds();

    results.forEach((result, index) => {
        const card = createResultCard(result);
        resultsContainer.appendChild(card);

        createMarker(result);
        bounds.extend(result.geometry.location);

        card.addEventListener('click', () => {
            if (!card.classList.contains('expanded')) {
                const request = {
                    placeId: result.place_id,
                    fields: ['name', 'formatted_address', 'rating', 'user_ratings_total', 'reviews', 'photos', 'opening_hours']
                };

                service.getDetails(request, (place, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK) {
                        updateCardWithDetails(card, place, query);
                        card.classList.add('expanded');
                    }
                });
            } else {
                card.classList.remove('expanded');
            }
        });
    });

    map.fitBounds(bounds);
}

function createResultCard(result) {
    const card = document.createElement('div');
    card.className = 'result-card';
    card.innerHTML = `
        <h2>${result.name}</h2>
        <p>${result.formatted_address}</p>
        <p><strong>Rating:</strong> ${result.rating} (${result.user_ratings_total} reviews)</p>
        <div class="full-info">
            <div class="contextual-content">
                <h3>Contextual Content</h3>
                <div class="reviews"></div>
                <div class="photos"></div>
                <div class="justifications"></div>
            </div>
        </div>
    `;
    return card;
}

function updateCardWithDetails(card, place, query) {
    const contextualContent = card.querySelector('.contextual-content');
    const reviewsContainer = contextualContent.querySelector('.reviews');
    const photosContainer = contextualContent.querySelector('.photos');
    const justificationsContainer = contextualContent.querySelector('.justifications');

    if (place.reviews && place.reviews.length > 0) {
        const relevantReviews = place.reviews.slice(0, 3);
        reviewsContainer.innerHTML = '<h4>Relevant Reviews</h4>';
        relevantReviews.forEach(review => {
            reviewsContainer.innerHTML += `
                <div class="review">
                    <p><strong>${review.author_name}</strong> (${review.rating} stars)</p>
                    <p>${review.text}</p>
                </div>
            `;
        });
    }

    if (place.photos && place.photos.length > 0) {
        const relevantPhotos = place.photos.slice(0, 5);
        photosContainer.innerHTML = '<h4>Photos</h4>';
        relevantPhotos.forEach(photo => {
            const imgUrl = photo.getUrl({maxWidth: 200, maxHeight: 200});
            photosContainer.innerHTML += `<img src="${imgUrl}" alt="Place photo">`;
        });
    }

    justificationsContainer.innerHTML = '<h4>Why this result?</h4>';
    const justification = generateContextualJustification(place, query);
    justificationsContainer.innerHTML += `<p>${justification}</p>`;
}

function createMarker(place) {
    const marker = new google.maps.Marker({
        map: map,
        position: place.geometry.location,
        title: place.name,
        icon: {
            path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
            fillColor: '#ff6600',  // A softer green color
            fillOpacity: 0.9,
            strokeColor: '#FFFFFF',
            strokeWeight: 2,
            scale: 1.8,
            anchor: new google.maps.Point(12, 24)
        }
    });

    google.maps.event.addListener(marker, 'click', () => {
        infowindow.setContent(`<strong>${place.name}</strong><br>${place.formatted_address}`);
        infowindow.open(map, marker);
    });
}

function generateContextualJustification(place, query) {
    const keywords = query.toLowerCase().split(' ');
    let justification = "This place matches your search criteria";

    if (place.reviews && place.reviews.length > 0) {
        const relevantReview = place.reviews.find(review => 
            keywords.some(keyword => review.text.toLowerCase().includes(keyword))
        );

        if (relevantReview) {
            const highlightedText = findHighlightedText(relevantReview.text, keywords);
            justification += ` and has been mentioned in a review: "${highlightedText}"`;
        }
    }

    if (place.opening_hours && place.opening_hours.isOpen()) {
        justification += ". The business is currently open.";
    }

    return justification;
}

function findHighlightedText(text, keywords) {
    const sentences = text.split('.');
    for (let sentence of sentences) {
        if (keywords.some(keyword => sentence.toLowerCase().includes(keyword))) {
            return sentence.trim();
        }
    }
    return text.substring(0, 100) + "...";
}

window.onload = initMap;
