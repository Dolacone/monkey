// ==UserScript==
// @name         YouTube Speed Adjuster
// @namespace    http://tampermonkey.net/
// @version      0.2.0
// @description  Adjust YouTube video speed with keyboard shortcuts (z to slow down, x to set speed to 1x, c to speed up) and display current speed rate
// @author       Dolacone
// @downloadURL  https://raw.githubusercontent.com/Dolacone/monkey/refs/heads/master/youtube-speed/youtube-speed.js
// @updateURL    https://raw.githubusercontent.com/Dolacone/monkey/refs/heads/master/youtube-speed/youtube-speed.js
// @match        https://www.youtube.com
// @match        https://www.youtube.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Array of predefined speed values, with 20x added
    const speeds = [0.5, 1, 1.25, 1.5, 2, 5, 10];
    let currentSpeedIndex = speeds.indexOf(document.getElementsByTagName("video")[0].playbackRate);

    // Create a floating div to show the current speed
    const speedDisplay = document.createElement('div');
    speedDisplay.style.position = 'fixed';
    speedDisplay.style.top = '10px';
    speedDisplay.style.right = '130px';
    speedDisplay.style.padding = '5px 10px';
    speedDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    speedDisplay.style.color = 'white';
    speedDisplay.style.fontSize = '16px';
    speedDisplay.style.borderRadius = '5px';
    speedDisplay.style.zIndex = '10000';
    speedDisplay.style.fontFamily = 'Arial, sans-serif';
    speedDisplay.textContent = `Speed: ${speeds[currentSpeedIndex]}x`;
    document.body.appendChild(speedDisplay);

    // Function to update the speed display
    function updateSpeedDisplay() {
        speedDisplay.textContent = `Speed: ${speeds[currentSpeedIndex]}x`;
    }

    // Function to adjust video speed
    function setSpeed(newSpeed) {
        document.getElementsByTagName("video")[0].playbackRate = newSpeed;
        updateSpeedDisplay();
    }

    // Function to speed up (same as previous c behavior)
    function speedUp() {
        // If the current speed is less than 20x, move to the next speed in the array
        if (currentSpeedIndex < speeds.length - 1) {
            currentSpeedIndex++;
        }
        // Ensure it doesn't go beyond 20x (i.e., the last element in the speeds array)
        setSpeed(speeds[currentSpeedIndex]);
    }

    // Function to slow down (same as previous z behavior)
    function speedDown() {
        // If the current speed is greater than 0.5x, move to the previous speed in the array
        if (currentSpeedIndex > 0) {
            currentSpeedIndex--;
        }
        setSpeed(speeds[currentSpeedIndex]);
    }

    // Function to reset speed to 1 (same as new x behavior)
    function resetSpeed() {
        currentSpeedIndex = speeds.indexOf(1); // Reset to speed 1
        setSpeed(speeds[currentSpeedIndex]);
    }

    // Function to set speed to last available speed (last index of the speeds array)
    function setLastSpeed() {
        currentSpeedIndex = speeds.length - 1; // Set to the last speed in the list
        setSpeed(speeds[currentSpeedIndex]);
    }

    // Event listener for keyboard shortcuts
    window.addEventListener('keydown', function(event) {
        if (event.key === 'x') {
            resetSpeed(); // Reset speed to 1x
        } else if (event.key === 'z') {
            speedDown(); // Slow down
        } else if (event.key === 'c') {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            speedUp(); // Speed up
        } else if (event.key === 'v') {
            setLastSpeed(); // Set speed to last available speed
        }
    }, true);  // set capture phase to true to block youtube key listener

    // Initialize the speed on page load
    window.addEventListener('load', function() {
        setSpeed(speeds[currentSpeedIndex]);
    });
    window.addEventListener('yt-navigate-finish', function() {
        setSpeed(speeds[currentSpeedIndex]);
    });
})();
