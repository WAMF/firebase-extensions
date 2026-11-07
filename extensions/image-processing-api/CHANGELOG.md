## Version 0.1.2

Security: an `input` operation of type `url` now only fetches from the hosts in the new `URL_HOST_ALLOW_LIST` parameter. The parameter is empty by default, which disables url inputs. Url inputs never connect to private, loopback or link-local addresses. Image fetches do not follow redirects, stop after 10 seconds and refuse responses larger than 20 MB.

## Version 0.1.1

Updated POSTINSTALL parameters.

## Version 0.1.0

Stable release with documentation.

## Version 0.0.2

Updated convolve feature to allow the correct number of inputs

## Version 0.0.1

Initial release of the **Image Processing Api** extension.
