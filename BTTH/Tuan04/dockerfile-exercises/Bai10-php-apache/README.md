Run with host source mount:

docker build -t bai10-php-apache .
docker run --rm -p 8080:80 -v ${PWD}:/var/www/html bai10-php-apache

On PowerShell, you can also use:

docker run --rm -p 8080:80 -v ${PWD}.Path:/var/www/html bai10-php-apache
