function Icon({ name, alt, size = "24px", style = {} }) {
  return (
    <img
      src={`/icons/${name}.jpg`}
      alt={alt}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        ...style
      }}
    />
  )
}

export default Icon
